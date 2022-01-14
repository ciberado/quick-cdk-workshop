import cdk = require('@aws-cdk/core');
import iam = require('@aws-cdk/aws-iam');
import rds = require('@aws-cdk/aws-rds');
import ec2 = require('@aws-cdk/aws-ec2');
import autoscaling = require('@aws-cdk/aws-autoscaling');
import elbv2 = require('@aws-cdk/aws-elasticloadbalancingv2');

class PetclinicVPCStack extends cdk.Stack {
  readonly vpc : ec2.Vpc;
  readonly privateSubnets: ec2.SelectedSubnets;

  readonly dbSecurityGroup : ec2.SecurityGroup;
  readonly asgSecurityGroup: ec2.SecurityGroup;
  readonly lbSecurityGroup : ec2.SecurityGroup;

  constructor(scope: cdk.App, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    this.vpc = new ec2.Vpc(this, 'VPC');

    this.privateSubnets = this.vpc.selectSubnets({subnetType: ec2.SubnetType.PRIVATE_WITH_NAT});

    this.dbSecurityGroup = new ec2.SecurityGroup(this, 'SG-DB', {
      vpc: this.vpc
    });
    this.asgSecurityGroup = new ec2.SecurityGroup(this, 'SG-APP', {
      vpc: this.vpc
    });
    this.lbSecurityGroup = new ec2.SecurityGroup(this, 'SG-ALB' , {
      vpc: this.vpc
    });
    this.dbSecurityGroup.addIngressRule(this.asgSecurityGroup, ec2.Port.tcp(3306), 'Mysql default port for App layer');
    // Next rules are optional, as they are automatically added by the Target Group and the ALB
    // based on the information provided by their configuration. We keep them mostly as a
    // documentation note.
    this.asgSecurityGroup.addIngressRule(this.lbSecurityGroup, ec2.Port.tcp(8080), 'App port for Load Balancer');
    this.lbSecurityGroup.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(80), 'Http open to anybody');
  }
}

class PetclinicDBStack extends cdk.Stack {
  readonly mysql: rds.DatabaseInstance;
  
  constructor(scope: cdk.App, id: string, 
              vpc: ec2.Vpc, privateSubnets: ec2.SelectedSubnets, 
              dbSecurityGroup : ec2.SecurityGroup,
              props?: cdk.StackProps) {
    super(scope, id, props);

    this.mysql = new rds.DatabaseInstance(this, 'DB-MAIN', {
      databaseName : 'petclinic',
      instanceIdentifier : 'PETCLINIC-DB',
      engine : rds.DatabaseInstanceEngine.mysql({
        version: rds.MysqlEngineVersion.VER_5_7
      }),       
      vpc : vpc,
      vpcSubnets : privateSubnets,
      securityGroups: [dbSecurityGroup],
      deletionProtection : false,
      multiAz : false,
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
    lbSecurityGroup: ec2.SecurityGroup,
    asgSecurityGroup : ec2.SecurityGroup,
    mysql: rds.DatabaseInstance,
    props?: cdk.StackProps) {
    super(scope, id, props);

    const userData = ec2.UserData.custom(
`#!/bin/sh

sudo apt update
sudo apt install openjdk-8-jdk-headless -y

git clone https://github.com/spring-petclinic/spring-framework-petclinic.git
cd spring-framework-petclinic

RDS=${mysql.dbInstanceEndpointAddress}
echo "RDS endpoint: $RDS."

./mvnw jetty:run-war -P MySQL -DskipTests

`);
    const ami = ec2.MachineImage.genericLinux({
      'eu-west-1': 'ami-020fc399c31009b50',
      'eu-central-1': 'ami-0215371f3ea49a91b'
    });
    const asg = new autoscaling.AutoScalingGroup(this, 'ASG', {
      vpc,
      securityGroup : asgSecurityGroup,
      instanceType: ec2.InstanceType.of(ec2.InstanceClass.T3, ec2.InstanceSize.SMALL),
      machineImage: ami,
      userData: userData,
      vpcSubnets: privateSubnets,
      maxCapacity: 4,
      minCapacity: 1,
      instanceMonitoring : autoscaling.Monitoring.DETAILED
    });
    asg.role.addManagedPolicy(
      iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonSSMManagedInstanceCore')
    );
    asg.scaleOnCpuUtilization('CpuScaling', {
      targetUtilizationPercent: 50,
      cooldown : cdk.Duration.seconds(120),
      estimatedInstanceWarmup : cdk.Duration.seconds(60)
    });

    const lb = new elbv2.ApplicationLoadBalancer(this, 'ALB', {
      vpc,
      internetFacing: true,
      securityGroup: lbSecurityGroup
    });
    const listener = lb.addListener('Listener' + process.env.USER, {
      port: 80,
      open: true,
    });   
    listener.addTargets('TG-MAIN' + process.env.USER, {
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
  vpcStack.vpc, vpcStack.privateSubnets, vpcStack.dbSecurityGroup, {
  tags: globalTags
});
dbStack.addDependency(vpcStack);

const appStack = new PetclinicAppStack(app, 'petclinic-APP-' + process.env.USER, 
  vpcStack.vpc, vpcStack.privateSubnets, 
  vpcStack.lbSecurityGroup, vpcStack.asgSecurityGroup, dbStack.mysql, {
  tags: globalTags
});
appStack.addDependency(dbStack);
