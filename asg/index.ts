import cdk = require('@aws-cdk/core');
import iam = require('@aws-cdk/aws-iam');
import rds = require('@aws-cdk/aws-rds');
import ec2 = require('@aws-cdk/aws-ec2');
import autoscaling = require('@aws-cdk/aws-autoscaling');
import elbv2 = require('@aws-cdk/aws-elasticloadbalancingv2');

class PetclinicVPCStack extends cdk.Stack {
  readonly vpc : ec2.Vpc;
  readonly privateSubnets: ec2.SelectedSubnets;

  constructor(scope: cdk.App, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    this.vpc = new ec2.Vpc(this, 'VPC' + process.env.USER);

    this.privateSubnets = this.vpc.selectSubnets({subnetType: ec2.SubnetType.PRIVATE_WITH_NAT});
  }
}

class PetclinicDBStack extends cdk.Stack {
  readonly mysql: rds.DatabaseInstance;

  constructor(scope: cdk.App, id: string, 
              vpc: ec2.Vpc, privateSubnets: ec2.SelectedSubnets, 
              props?: cdk.StackProps) {
    super(scope, id, props);

    this.mysql = new rds.DatabaseInstance(this, 'DBMain' + process.env.USER, {
      engine : rds.DatabaseInstanceEngine.mysql({
        version: rds.MysqlEngineVersion.VER_5_7
      }),       
      deletionProtection : false,
      multiAz : false,
      vpc : vpc,
      instanceIdentifier : 'pokemonDB' + process.env.USER,
      vpcSubnets : privateSubnets,
      credentials : {
        username : 'admin',
        password : cdk.SecretValue.plainText('p3tcl1n1c')
      }
    });
  }
}

class PetclinicAppStack extends cdk.Stack {
  constructor(scope: cdk.App, id: string, 
    vpc: ec2.Vpc, privateSubnets: ec2.SelectedSubnets, 
    mysql: rds.DatabaseInstance,
    props?: cdk.StackProps) {
    super(scope, id, props);

    const userData = ec2.UserData.custom(
`#!/bin/sh

sudo apt update
sudo apt install openjdk-8-jre-headless -y

# pokemon
git clone https://github.com/spring-petclinic/spring-framework-petclinic.git
cd spring-framework-petclinic

RDS=${mysql.dbInstanceEndpointAddress}
./mvnw jetty:run-war -P MySQL

`);
    const ami = ec2.MachineImage.genericLinux({
      'eu-west-1': 'ami-020fc399c31009b50',
      'eu-central-1': 'ami-0215371f3ea49a91b'
    });
    const asg = new autoscaling.AutoScalingGroup(this, 'ASG' + process.env.USER, {
      vpc,
      instanceType: ec2.InstanceType.of(ec2.InstanceClass.T3, ec2.InstanceSize.MICRO),
      machineImage: ami,
      userData: userData,
      vpcSubnets: privateSubnets,
      maxCapacity: 4,
      minCapacity: 1     
    });
    asg.role.addManagedPolicy(
      iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonSSMManagedInstanceCore')
    );
    asg.scaleOnCpuUtilization('CpuScaling', {
      targetUtilizationPercent: 50,
      cooldown : cdk.Duration.seconds(120),
      estimatedInstanceWarmup : cdk.Duration.seconds(60)
    });

    mysql.connections.allowDefaultPortFrom(asg);

    const lb = new elbv2.ApplicationLoadBalancer(this, 'ALB' + process.env.USER, {
      vpc,
      internetFacing: true
    });
    const listener = lb.addListener('Listener' + process.env.USER, {
      port: 80,
      open: true,
    });   
    listener.addTargets('pokemonAppFleet' + process.env.USER, {
      port: 8080,
      targets: [asg],
      healthCheck: {
        path: '/health',
        interval: cdk.Duration.minutes(1),
      }
    });

    new cdk.CfnOutput(this, 'LoadBalancerDNS', {
      value: lb.loadBalancerDnsName
    });


  }
}


const app = new cdk.App();

const globalTags = {
  'project' : 'quick-cdk-workshop',
  'owner' : process.env.USER!
};

const vpcStack = new PetclinicVPCStack(app, 'petclinic-VPC-' + process.env.USER, {
  tags: globalTags
});

const dbStack = new PetclinicDBStack(app, 'petclinic-DB-' + process.env.USER, 
  vpcStack.vpc, vpcStack.privateSubnets, {
  tags: globalTags
});
dbStack.addDependency(vpcStack);

const appStack = new PetclinicAppStack(app, 'petclinic-APP-' + process.env.USER, 
  vpcStack.vpc, vpcStack.privateSubnets, dbStack.mysql, {
  tags: globalTags
});
appStack.addDependency(dbStack);


