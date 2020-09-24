const cdk = require('@aws-cdk/core');
const ec2 = require('@aws-cdk/aws-ec2');
const RDS = require('@aws-cdk/aws-rds');
const autoscaling = require('@aws-cdk/aws-autoscaling');
const elb = require('@aws-cdk/aws-elasticloadbalancing');

class StandardDemoStack extends cdk.Stack {
  constructor(app, id) {
    super(app, id);
    const vpc = new ec2.Vpc(this, 'VPC');

    const privateSubnets = vpc.selectSubnets({subnetType: ec2.SubnetType.Private}).subnets;

    const userData = ec2.UserData.custom(`
#!/bin/sh

wget https://github.com/ciberado/pokemon/releases/download/stress/pokemon-0.0.4-SNAPSHOT.jar
java -jar pokemon-0.0.4-SNAPSHOT.jar
    `);

    const asg = new autoscaling.AutoScalingGroup(this, 'pokemonASG', {
      vpc,
      instanceType: ec2.InstanceType.of(ec2.InstanceClass.T2, ec2.InstanceSize.MICRO),
      machineImage: new ec2.AmazonLinuxImage(),
      userData: userData,
      vpcSubnets: privateSubnets,
      maxCapacity: 4,
      desiredCapacity: 2,
      minCapacity: 1
    });
    asg.scaleOnCpuUtilization('CpuScaling', {
      targetUtilizationPercent: 50,
      scaleInCooldown: cdk.Duration.seconds(60),
      scaleOutCooldown: cdk.Duration.seconds(60),
    });

    const mySql = new RDS.DatabaseInstance(this, "pokemonDBMain", {
        engine : RDS.DatabaseInstanceEngine.mysql({
          version : RDS.MysqlEngineVersion.VER_8_0_19
        }),        
        backupRetention : cdk.Duration.days(1),
        deletionProtection : false,
        masterUsername : "admin",
        masterUserPassword : cdk.SecretValue.plainText('supersecret'),
        multiAz : false,
        instanceClass : ec2.InstanceType.of(ec2.InstanceClass.BURSTABLE2, ec2.InstanceSize.MICRO),
        vpc : vpc,
        instanceIdentifier : "pokemonDBMainInstance"
    });
    mySql.connections.allowDefaultPortFrom(asg);

    const lb = new elb.LoadBalancer(this, 'pokemonLoadBalancer', {
      vpc,
      internetFacing: true,
      healthCheck: {
        port: 8080
      },
    });

    lb.addTarget(asg);

    const listener = lb.addListener({ externalPort: 80, internalPort : 8080 });
    listener.connections.allowDefaultPortFromAnyIpv4('Open to the world');

    new cdk.CfnOutput(this, 'LoadBalancerDNS', {
      value: lb.loadBalancerDnsName
    });
  }
}

const app = new cdk.App();
new StandardDemoStack(app, 'PokemonStack');