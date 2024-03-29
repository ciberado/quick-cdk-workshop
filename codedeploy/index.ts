import cdk = require('@aws-cdk/core');
import iam = require('@aws-cdk/aws-iam');
import ec2 = require('@aws-cdk/aws-ec2');
import autoscaling = require('@aws-cdk/aws-autoscaling');
import elbv2 = require('@aws-cdk/aws-elasticloadbalancingv2');

import codepipeline = require('@aws-cdk/aws-codepipeline');
import actions = require('@aws-cdk/aws-codepipeline-actions');
import cloudtrail = require ('@aws-cdk/aws-cloudtrail');
import s3 = require('@aws-cdk/aws-s3');

class SimplestWebStack extends cdk.Stack {
  constructor(scope: cdk.App, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const vpc = new ec2.Vpc(this, 'VPC');

    const privateSubnets = vpc.selectSubnets({subnetType: ec2.SubnetType.PRIVATE_WITH_NAT});

    const userData = ec2.UserData.custom(`#!/bin/sh

# nginx server
sudo apt update
apt-get install -y nginx
service nginx start

# cloud deploy agent
apt install -y ruby-full wget
cd /home/ubuntu
wget https://aws-codedeploy-eu-west-1.s3.eu-west-1.amazonaws.com/latest/install
chmod +x ./install
./install auto > /tmp/logfile
service codedeploy-agent status

        `);
    const ami = ec2.MachineImage.genericLinux({
      'eu-west-1': 'ami-020fc399c31009b50',
      'eu-central-1': 'ami-0215371f3ea49a91b'
    });
    const asg = new autoscaling.AutoScalingGroup(this, 'SimplestWebASG', {
      vpc,
      instanceType: ec2.InstanceType.of(ec2.InstanceClass.T3, ec2.InstanceSize.MICRO),
      machineImage: ami,
      userData: userData,
      vpcSubnets: privateSubnets,
      maxCapacity: 4,
      minCapacity: 1
    });
    asg.role.addManagedPolicy(
      iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonS3FullAccess')
    );
    asg.role.addManagedPolicy(
      iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonSSMManagedInstanceCore')
    );

    const lb = new elbv2.ApplicationLoadBalancer(this, 'LB', {
      vpc,
      internetFacing: true
    });
    const listener = lb.addListener('Listener', {
      port: 80,
      open: true,
    });   
    listener.addTargets('SimplestWebFleet', {
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

class SimplestWebPipelineStack extends cdk.Stack {
  constructor(scope: cdk.App, id: string, props?: cdk.StackProps) {
    super(scope, id, props)
    const sourceBucket = new s3.Bucket(this, 'SourceBucket', {
      versioned : true
    });
    const pipeline = new codepipeline.Pipeline(this, 'SimplestWebPipeline');
    const sourceArtifact = new codepipeline.Artifact('SimplestWebArtifact');

    const appFilePath = 'simplest-web-app.zip';
    const trail = new cloudtrail.Trail(this, 'CloudTrail');
    trail.addS3EventSelector([{
      bucket: sourceBucket,
      objectPrefix: appFilePath,
    }], {
      readWriteType: cloudtrail.ReadWriteType.WRITE_ONLY,
    });    
    const s3SourceAction = new actions.S3SourceAction({
        actionName: 'SourceFromS3',
        bucket: sourceBucket,
        bucketKey: appFilePath,
        output: sourceArtifact,
        trigger: actions.S3Trigger.EVENTS, // Use .POLL as an alternative to avoid cloudtrail
    });
    pipeline.addStage({
        stageName: 'Source',
        actions: [ s3SourceAction ]
    });

    const dummyAction = new actions.S3DeployAction({
      actionName: 'Dummy',
      bucket: sourceBucket,
      input: sourceArtifact,
      objectKey: 'dummy.zip'
    });
    pipeline.addStage({
        stageName: 'Dummy',
        actions: [ dummyAction ]
    });

    new cdk.CfnOutput(this, 'SourceBucketName', {
      value: sourceBucket.bucketName
    });

  }
}

const app = new cdk.App();

new SimplestWebStack(app, 'SimplestWebStack-' + process.env.USER);
// new SimplestWebPipelineStack(app, 'SimplestWebPipelineStack');

app.synth();
