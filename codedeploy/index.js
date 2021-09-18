"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const cdk = require("@aws-cdk/core");
const iam = require("@aws-cdk/aws-iam");
const s3 = require("@aws-cdk/aws-s3");
const s3deploy = require("@aws-cdk/aws-s3-deployment");
const ec2 = require("@aws-cdk/aws-ec2");
const autoscaling = require("@aws-cdk/aws-autoscaling");
const elb = require("@aws-cdk/aws-elasticloadbalancing");
class SimplestWebCodeDeployStack extends cdk.Stack {
    constructor(scope, id, props) {
        super(scope, id, props);
        const appBucket = new s3.Bucket(this, 'assets');
        new s3deploy.BucketDeployment(this, 'DeployFiles', {
            sources: [s3deploy.Source.asset('./assets')],
            destinationBucket: appBucket,
        });
        const vpc = new ec2.Vpc(this, 'VPC');
        const privateSubnets = vpc.selectSubnets({ subnetType: ec2.SubnetType.PRIVATE_WITH_NAT });
        const userData = ec2.UserData.custom(`#!/bin/sh

sudo apt update
apt-get install -y nginx
service nginx start

apt install -y ruby-full wget
cd /home/ubuntu
wget https://aws-codedeploy-eu-west-1.s3.eu-west-1.amazonaws.com/latest/install
chmod +x ./install
./install auto > /tmp/logfile
service codedeploy-agent status

        `);
        const ami = ec2.MachineImage.genericLinux({
            'eu-west-1': 'ami-0088366b4b407a312'
        });
        const asg = new autoscaling.AutoScalingGroup(this, 'SimplestWebASG', {
            vpc,
            instanceType: ec2.InstanceType.of(ec2.InstanceClass.T3, ec2.InstanceSize.MICRO),
            machineImage: ami,
            userData: userData,
            vpcSubnets: privateSubnets,
            maxCapacity: 4,
            minCapacity: 0
        });
        asg.role.addManagedPolicy(iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonS3FullAccess'));
        asg.role.addManagedPolicy(iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonSSMManagedInstanceCore'));
        const lb = new elb.LoadBalancer(this, 'SimplestWebLoadBalancer', {
            vpc,
            internetFacing: true,
            healthCheck: {
                port: 80
            },
        });
        lb.addTarget(asg);
        const listener = lb.addListener({ externalPort: 80, internalPort: 80 });
        listener.connections.allowDefaultPortFromAnyIpv4('Open to the world');
        new cdk.CfnOutput(this, 'LoadBalancerDNS', {
            value: lb.loadBalancerDnsName
        });
        new cdk.CfnOutput(this, 'AppBucket', {
            value: appBucket.bucketName
        });
    }
}
const app = new cdk.App();
new SimplestWebCodeDeployStack(app, 'SimplestWebCodeDeployStack');
app.synth();
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJpbmRleC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOztBQUFBLHFDQUFzQztBQUN0Qyx3Q0FBeUM7QUFDekMsc0NBQXVDO0FBQ3ZDLHVEQUF3RDtBQUN4RCx3Q0FBeUM7QUFDekMsd0RBQXlEO0FBQ3pELHlEQUEwRDtBQUUxRCxNQUFNLDBCQUEyQixTQUFRLEdBQUcsQ0FBQyxLQUFLO0lBQ2hELFlBQVksS0FBYyxFQUFFLEVBQVUsRUFBRSxLQUFzQjtRQUM1RCxLQUFLLENBQUMsS0FBSyxFQUFFLEVBQUUsRUFBRSxLQUFLLENBQUMsQ0FBQztRQUV4QixNQUFNLFNBQVMsR0FBRyxJQUFJLEVBQUUsQ0FBQyxNQUFNLENBQUMsSUFBSSxFQUFFLFFBQVEsQ0FBQyxDQUFDO1FBRWhELElBQUksUUFBUSxDQUFDLGdCQUFnQixDQUFDLElBQUksRUFBRSxhQUFhLEVBQUU7WUFDakQsT0FBTyxFQUFFLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsVUFBVSxDQUFDLENBQUM7WUFDNUMsaUJBQWlCLEVBQUUsU0FBUztTQUM3QixDQUFDLENBQUM7UUFFSCxNQUFNLEdBQUcsR0FBRyxJQUFJLEdBQUcsQ0FBQyxHQUFHLENBQUMsSUFBSSxFQUFFLEtBQUssQ0FBQyxDQUFDO1FBRXJDLE1BQU0sY0FBYyxHQUFHLEdBQUcsQ0FBQyxhQUFhLENBQUMsRUFBQyxVQUFVLEVBQUUsR0FBRyxDQUFDLFVBQVUsQ0FBQyxnQkFBZ0IsRUFBQyxDQUFDLENBQUM7UUFFeEYsTUFBTSxRQUFRLEdBQUcsR0FBRyxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUM7Ozs7Ozs7Ozs7Ozs7U0FhaEMsQ0FBQyxDQUFDO1FBQ1AsTUFBTSxHQUFHLEdBQUcsR0FBRyxDQUFDLFlBQVksQ0FBQyxZQUFZLENBQUM7WUFDeEMsV0FBVyxFQUFFLHVCQUF1QjtTQUNyQyxDQUFDLENBQUM7UUFDSCxNQUFNLEdBQUcsR0FBRyxJQUFJLFdBQVcsQ0FBQyxnQkFBZ0IsQ0FBQyxJQUFJLEVBQUUsZ0JBQWdCLEVBQUU7WUFDbkUsR0FBRztZQUNILFlBQVksRUFBRSxHQUFHLENBQUMsWUFBWSxDQUFDLEVBQUUsQ0FBQyxHQUFHLENBQUMsYUFBYSxDQUFDLEVBQUUsRUFBRSxHQUFHLENBQUMsWUFBWSxDQUFDLEtBQUssQ0FBQztZQUMvRSxZQUFZLEVBQUUsR0FBRztZQUNqQixRQUFRLEVBQUUsUUFBUTtZQUNsQixVQUFVLEVBQUUsY0FBYztZQUMxQixXQUFXLEVBQUUsQ0FBQztZQUNkLFdBQVcsRUFBRSxDQUFDO1NBQ2YsQ0FBQyxDQUFDO1FBQ0gsR0FBRyxDQUFDLElBQUksQ0FBQyxnQkFBZ0IsQ0FDdkIsR0FBRyxDQUFDLGFBQWEsQ0FBQyx3QkFBd0IsQ0FBQyxvQkFBb0IsQ0FBQyxDQUNqRSxDQUFDO1FBQ0YsR0FBRyxDQUFDLElBQUksQ0FBQyxnQkFBZ0IsQ0FDdkIsR0FBRyxDQUFDLGFBQWEsQ0FBQyx3QkFBd0IsQ0FBQyw4QkFBOEIsQ0FBQyxDQUMzRSxDQUFDO1FBR0YsTUFBTSxFQUFFLEdBQUcsSUFBSSxHQUFHLENBQUMsWUFBWSxDQUFDLElBQUksRUFBRSx5QkFBeUIsRUFBRTtZQUMvRCxHQUFHO1lBQ0gsY0FBYyxFQUFFLElBQUk7WUFDcEIsV0FBVyxFQUFFO2dCQUNYLElBQUksRUFBRSxFQUFFO2FBQ1Q7U0FDRixDQUFDLENBQUM7UUFFSCxFQUFFLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxDQUFDO1FBRWxCLE1BQU0sUUFBUSxHQUFHLEVBQUUsQ0FBQyxXQUFXLENBQUMsRUFBRSxZQUFZLEVBQUUsRUFBRSxFQUFFLFlBQVksRUFBRyxFQUFFLEVBQUUsQ0FBQyxDQUFDO1FBQ3pFLFFBQVEsQ0FBQyxXQUFXLENBQUMsMkJBQTJCLENBQUMsbUJBQW1CLENBQUMsQ0FBQztRQUV0RSxJQUFJLEdBQUcsQ0FBQyxTQUFTLENBQUMsSUFBSSxFQUFFLGlCQUFpQixFQUFFO1lBQ3pDLEtBQUssRUFBRSxFQUFFLENBQUMsbUJBQW1CO1NBQzlCLENBQUMsQ0FBQztRQUVILElBQUksR0FBRyxDQUFDLFNBQVMsQ0FBQyxJQUFJLEVBQUUsV0FBVyxFQUFFO1lBQ25DLEtBQUssRUFBRSxTQUFTLENBQUMsVUFBVTtTQUM1QixDQUFDLENBQUM7SUFFTCxDQUFDO0NBQ0Y7QUFFRCxNQUFNLEdBQUcsR0FBRyxJQUFJLEdBQUcsQ0FBQyxHQUFHLEVBQUUsQ0FBQztBQUUxQixJQUFJLDBCQUEwQixDQUFDLEdBQUcsRUFBRSw0QkFBNEIsQ0FBQyxDQUFDO0FBRWxFLEdBQUcsQ0FBQyxLQUFLLEVBQUUsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCBjZGsgPSByZXF1aXJlKCdAYXdzLWNkay9jb3JlJyk7XG5pbXBvcnQgaWFtID0gcmVxdWlyZSgnQGF3cy1jZGsvYXdzLWlhbScpO1xuaW1wb3J0IHMzID0gcmVxdWlyZSgnQGF3cy1jZGsvYXdzLXMzJyk7XG5pbXBvcnQgczNkZXBsb3kgPSByZXF1aXJlKCdAYXdzLWNkay9hd3MtczMtZGVwbG95bWVudCcpO1xuaW1wb3J0IGVjMiA9IHJlcXVpcmUoJ0Bhd3MtY2RrL2F3cy1lYzInKTtcbmltcG9ydCBhdXRvc2NhbGluZyA9IHJlcXVpcmUoJ0Bhd3MtY2RrL2F3cy1hdXRvc2NhbGluZycpO1xuaW1wb3J0IGVsYiA9IHJlcXVpcmUoJ0Bhd3MtY2RrL2F3cy1lbGFzdGljbG9hZGJhbGFuY2luZycpO1xuXG5jbGFzcyBTaW1wbGVzdFdlYkNvZGVEZXBsb3lTdGFjayBleHRlbmRzIGNkay5TdGFjayB7XG4gIGNvbnN0cnVjdG9yKHNjb3BlOiBjZGsuQXBwLCBpZDogc3RyaW5nLCBwcm9wcz86IGNkay5TdGFja1Byb3BzKSB7XG4gICAgc3VwZXIoc2NvcGUsIGlkLCBwcm9wcyk7XG5cbiAgICBjb25zdCBhcHBCdWNrZXQgPSBuZXcgczMuQnVja2V0KHRoaXMsICdhc3NldHMnKTtcbiAgICBcbiAgICBuZXcgczNkZXBsb3kuQnVja2V0RGVwbG95bWVudCh0aGlzLCAnRGVwbG95RmlsZXMnLCB7XG4gICAgICBzb3VyY2VzOiBbczNkZXBsb3kuU291cmNlLmFzc2V0KCcuL2Fzc2V0cycpXSwgXG4gICAgICBkZXN0aW5hdGlvbkJ1Y2tldDogYXBwQnVja2V0LFxuICAgIH0pOyAgICBcblxuICAgIGNvbnN0IHZwYyA9IG5ldyBlYzIuVnBjKHRoaXMsICdWUEMnKTtcblxuICAgIGNvbnN0IHByaXZhdGVTdWJuZXRzID0gdnBjLnNlbGVjdFN1Ym5ldHMoe3N1Ym5ldFR5cGU6IGVjMi5TdWJuZXRUeXBlLlBSSVZBVEVfV0lUSF9OQVR9KTtcblxuICAgIGNvbnN0IHVzZXJEYXRhID0gZWMyLlVzZXJEYXRhLmN1c3RvbShgIyEvYmluL3NoXG5cbnN1ZG8gYXB0IHVwZGF0ZVxuYXB0LWdldCBpbnN0YWxsIC15IG5naW54XG5zZXJ2aWNlIG5naW54IHN0YXJ0XG5cbmFwdCBpbnN0YWxsIC15IHJ1YnktZnVsbCB3Z2V0XG5jZCAvaG9tZS91YnVudHVcbndnZXQgaHR0cHM6Ly9hd3MtY29kZWRlcGxveS1ldS13ZXN0LTEuczMuZXUtd2VzdC0xLmFtYXpvbmF3cy5jb20vbGF0ZXN0L2luc3RhbGxcbmNobW9kICt4IC4vaW5zdGFsbFxuLi9pbnN0YWxsIGF1dG8gPiAvdG1wL2xvZ2ZpbGVcbnNlcnZpY2UgY29kZWRlcGxveS1hZ2VudCBzdGF0dXNcblxuICAgICAgICBgKTtcbiAgICBjb25zdCBhbWkgPSBlYzIuTWFjaGluZUltYWdlLmdlbmVyaWNMaW51eCh7XG4gICAgICAnZXUtd2VzdC0xJzogJ2FtaS0wMDg4MzY2YjRiNDA3YTMxMidcbiAgICB9KTtcbiAgICBjb25zdCBhc2cgPSBuZXcgYXV0b3NjYWxpbmcuQXV0b1NjYWxpbmdHcm91cCh0aGlzLCAnU2ltcGxlc3RXZWJBU0cnLCB7XG4gICAgICB2cGMsXG4gICAgICBpbnN0YW5jZVR5cGU6IGVjMi5JbnN0YW5jZVR5cGUub2YoZWMyLkluc3RhbmNlQ2xhc3MuVDMsIGVjMi5JbnN0YW5jZVNpemUuTUlDUk8pLFxuICAgICAgbWFjaGluZUltYWdlOiBhbWksXG4gICAgICB1c2VyRGF0YTogdXNlckRhdGEsXG4gICAgICB2cGNTdWJuZXRzOiBwcml2YXRlU3VibmV0cyxcbiAgICAgIG1heENhcGFjaXR5OiA0LFxuICAgICAgbWluQ2FwYWNpdHk6IDBcbiAgICB9KTtcbiAgICBhc2cucm9sZS5hZGRNYW5hZ2VkUG9saWN5KFxuICAgICAgaWFtLk1hbmFnZWRQb2xpY3kuZnJvbUF3c01hbmFnZWRQb2xpY3lOYW1lKCdBbWF6b25TM0Z1bGxBY2Nlc3MnKVxuICAgICk7XG4gICAgYXNnLnJvbGUuYWRkTWFuYWdlZFBvbGljeShcbiAgICAgIGlhbS5NYW5hZ2VkUG9saWN5LmZyb21Bd3NNYW5hZ2VkUG9saWN5TmFtZSgnQW1hem9uU1NNTWFuYWdlZEluc3RhbmNlQ29yZScpXG4gICAgKTtcblxuXG4gICAgY29uc3QgbGIgPSBuZXcgZWxiLkxvYWRCYWxhbmNlcih0aGlzLCAnU2ltcGxlc3RXZWJMb2FkQmFsYW5jZXInLCB7XG4gICAgICB2cGMsXG4gICAgICBpbnRlcm5ldEZhY2luZzogdHJ1ZSxcbiAgICAgIGhlYWx0aENoZWNrOiB7XG4gICAgICAgIHBvcnQ6IDgwXG4gICAgICB9LFxuICAgIH0pO1xuXG4gICAgbGIuYWRkVGFyZ2V0KGFzZyk7XG5cbiAgICBjb25zdCBsaXN0ZW5lciA9IGxiLmFkZExpc3RlbmVyKHsgZXh0ZXJuYWxQb3J0OiA4MCwgaW50ZXJuYWxQb3J0IDogODAgfSk7XG4gICAgbGlzdGVuZXIuY29ubmVjdGlvbnMuYWxsb3dEZWZhdWx0UG9ydEZyb21BbnlJcHY0KCdPcGVuIHRvIHRoZSB3b3JsZCcpO1xuXG4gICAgbmV3IGNkay5DZm5PdXRwdXQodGhpcywgJ0xvYWRCYWxhbmNlckROUycsIHtcbiAgICAgIHZhbHVlOiBsYi5sb2FkQmFsYW5jZXJEbnNOYW1lXG4gICAgfSk7XG5cbiAgICBuZXcgY2RrLkNmbk91dHB1dCh0aGlzLCAnQXBwQnVja2V0Jywge1xuICAgICAgdmFsdWU6IGFwcEJ1Y2tldC5idWNrZXROYW1lXG4gICAgfSk7XG5cbiAgfVxufVxuXG5jb25zdCBhcHAgPSBuZXcgY2RrLkFwcCgpO1xuXG5uZXcgU2ltcGxlc3RXZWJDb2RlRGVwbG95U3RhY2soYXBwLCAnU2ltcGxlc3RXZWJDb2RlRGVwbG95U3RhY2snKTtcblxuYXBwLnN5bnRoKCk7XG4iXX0=