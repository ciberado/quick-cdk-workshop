import cdk = require('@aws-cdk/core');
import iam = require('@aws-cdk/aws-iam');
import rds = require('@aws-cdk/aws-rds');
import ec2 = require('@aws-cdk/aws-ec2');
import autoscaling = require('@aws-cdk/aws-autoscaling');
import elbv2 = require('@aws-cdk/aws-elasticloadbalancingv2');

class PokemonStack extends cdk.Stack {
  constructor(scope: cdk.App, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const vpc = new ec2.Vpc(this, 'VPC' + process.env.USER);

    const privateSubnets = vpc.selectSubnets({subnetType: ec2.SubnetType.PRIVATE_WITH_NAT});

    const userData = ec2.UserData.custom(
`#!/bin/sh

sudo apt update

# cloud deploy agent
apt install -y ruby-full wget
cd /home/ubuntu
wget https://aws-codedeploy-eu-west-1.s3.eu-west-1.amazonaws.com/latest/install
chmod +x ./install
./install auto > /tmp/logfile
service codedeploy-agent status

# pokemon
sudo apt install openjdk-8-jre-headless -y
wget https://github.com/ciberado/pokemon/releases/download/stress/pokemon-0.0.4-SNAPSHOT.jar
java -jar pokemon-0.0.4-SNAPSHOT.jar

`);
    const ami = ec2.MachineImage.genericLinux({
      'eu-west-1': 'ami-020fc399c31009b50',
      'eu-central-1': 'ami-0215371f3ea49a91b'
    });
    const asg = new autoscaling.AutoScalingGroup(this, 'pokemonASG' + process.env.USER, {
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

    const postgres = new rds.DatabaseInstance(this, 'pokemonDBMain' + process.env.USER, {
      engine : rds.DatabaseInstanceEngine.postgres({
        version: rds.PostgresEngineVersion.VER_12_4,
      }),       
      deletionProtection : false,
      multiAz : false,
      vpc : vpc,
      instanceIdentifier : 'pokemonDB' + process.env.USER,
      vpcSubnets : privateSubnets,
      credentials : {
        username : 'postadmin',
        password : cdk.SecretValue.plainText('supersecret')
      }
    });
    postgres.connections.allowDefaultPortFrom(asg);

    const lb = new elbv2.ApplicationLoadBalancer(this, 'pokemonALB' + process.env.USER, {
      vpc,
      internetFacing: true
    });
    const listener = lb.addListener('Listener' + process.env.USER, {
      port: 80,
      open: true,
    });   
    listener.addTargets('pokemonAppFleet' + process.env.USER, {
      port: 80,
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

new PokemonStack(app, 'pokemon-' + process.env.USER);
