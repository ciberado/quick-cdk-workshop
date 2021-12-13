"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const cdk = require("@aws-cdk/core");
const iam = require("@aws-cdk/aws-iam");
const rds = require("@aws-cdk/aws-rds");
const ec2 = require("@aws-cdk/aws-ec2");
const autoscaling = require("@aws-cdk/aws-autoscaling");
const elbv2 = require("@aws-cdk/aws-elasticloadbalancingv2");
class SimplestWebStack extends cdk.Stack {
    constructor(scope, id, props) {
        super(scope, id, props);
        const vpc = new ec2.Vpc(this, 'VPC');
        const privateSubnets = vpc.selectSubnets({ subnetType: ec2.SubnetType.PRIVATE_WITH_NAT });
        const userData = ec2.UserData.custom(`#!/bin/sh

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
        const asg = new autoscaling.AutoScalingGroup(this, 'PokemonASG', {
            vpc,
            instanceType: ec2.InstanceType.of(ec2.InstanceClass.T3, ec2.InstanceSize.MICRO),
            machineImage: ami,
            userData: userData,
            vpcSubnets: privateSubnets,
            maxCapacity: 4,
            minCapacity: 1
        });
        asg.role.addManagedPolicy(iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonSSMManagedInstanceCore'));
        const postgres = new rds.DatabaseInstance(this, 'pokemonDBMain', {
            engine: rds.DatabaseInstanceEngine.postgres({
                version: rds.PostgresEngineVersion.VER_12_4,
            }),
            deletionProtection: false,
            multiAz: false,
            vpc: vpc,
            instanceIdentifier: 'pokemonDBMainInstance',
            vpcSubnets: privateSubnets,
            credentials: {
                username: 'admin',
                password: cdk.SecretValue.plainText('supersecret')
            }
        });
        postgres.connections.allowDefaultPortFrom(asg);
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
const app = new cdk.App();
new SimplestWebStack(app, 'pokemon-' + process.env.USER);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJpbmRleC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOztBQUFBLHFDQUFzQztBQUN0Qyx3Q0FBeUM7QUFDekMsd0NBQXlDO0FBQ3pDLHdDQUF5QztBQUN6Qyx3REFBeUQ7QUFDekQsNkRBQThEO0FBRTlELE1BQU0sZ0JBQWlCLFNBQVEsR0FBRyxDQUFDLEtBQUs7SUFDdEMsWUFBWSxLQUFjLEVBQUUsRUFBVSxFQUFFLEtBQXNCO1FBQzVELEtBQUssQ0FBQyxLQUFLLEVBQUUsRUFBRSxFQUFFLEtBQUssQ0FBQyxDQUFDO1FBRXhCLE1BQU0sR0FBRyxHQUFHLElBQUksR0FBRyxDQUFDLEdBQUcsQ0FBQyxJQUFJLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFFckMsTUFBTSxjQUFjLEdBQUcsR0FBRyxDQUFDLGFBQWEsQ0FBQyxFQUFDLFVBQVUsRUFBRSxHQUFHLENBQUMsVUFBVSxDQUFDLGdCQUFnQixFQUFDLENBQUMsQ0FBQztRQUV4RixNQUFNLFFBQVEsR0FBRyxHQUFHLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FDeEM7Ozs7Ozs7Ozs7Ozs7Ozs7O0NBaUJDLENBQUMsQ0FBQztRQUNDLE1BQU0sR0FBRyxHQUFHLEdBQUcsQ0FBQyxZQUFZLENBQUMsWUFBWSxDQUFDO1lBQ3hDLFdBQVcsRUFBRSx1QkFBdUI7WUFDcEMsY0FBYyxFQUFFLHVCQUF1QjtTQUN4QyxDQUFDLENBQUM7UUFDSCxNQUFNLEdBQUcsR0FBRyxJQUFJLFdBQVcsQ0FBQyxnQkFBZ0IsQ0FBQyxJQUFJLEVBQUUsWUFBWSxFQUFFO1lBQy9ELEdBQUc7WUFDSCxZQUFZLEVBQUUsR0FBRyxDQUFDLFlBQVksQ0FBQyxFQUFFLENBQUMsR0FBRyxDQUFDLGFBQWEsQ0FBQyxFQUFFLEVBQUUsR0FBRyxDQUFDLFlBQVksQ0FBQyxLQUFLLENBQUM7WUFDL0UsWUFBWSxFQUFFLEdBQUc7WUFDakIsUUFBUSxFQUFFLFFBQVE7WUFDbEIsVUFBVSxFQUFFLGNBQWM7WUFDMUIsV0FBVyxFQUFFLENBQUM7WUFDZCxXQUFXLEVBQUUsQ0FBQztTQUNmLENBQUMsQ0FBQztRQUNILEdBQUcsQ0FBQyxJQUFJLENBQUMsZ0JBQWdCLENBQ3ZCLEdBQUcsQ0FBQyxhQUFhLENBQUMsd0JBQXdCLENBQUMsOEJBQThCLENBQUMsQ0FDM0UsQ0FBQztRQUVGLE1BQU0sUUFBUSxHQUFHLElBQUksR0FBRyxDQUFDLGdCQUFnQixDQUFDLElBQUksRUFBRSxlQUFlLEVBQUU7WUFDL0QsTUFBTSxFQUFHLEdBQUcsQ0FBQyxzQkFBc0IsQ0FBQyxRQUFRLENBQUM7Z0JBQzNDLE9BQU8sRUFBRSxHQUFHLENBQUMscUJBQXFCLENBQUMsUUFBUTthQUM1QyxDQUFDO1lBQ0Ysa0JBQWtCLEVBQUcsS0FBSztZQUMxQixPQUFPLEVBQUcsS0FBSztZQUNmLEdBQUcsRUFBRyxHQUFHO1lBQ1Qsa0JBQWtCLEVBQUcsdUJBQXVCO1lBQzVDLFVBQVUsRUFBRyxjQUFjO1lBQzNCLFdBQVcsRUFBRztnQkFDWixRQUFRLEVBQUcsT0FBTztnQkFDbEIsUUFBUSxFQUFHLEdBQUcsQ0FBQyxXQUFXLENBQUMsU0FBUyxDQUFDLGFBQWEsQ0FBQzthQUNwRDtTQUNGLENBQUMsQ0FBQztRQUNILFFBQVEsQ0FBQyxXQUFXLENBQUMsb0JBQW9CLENBQUMsR0FBRyxDQUFDLENBQUM7UUFFL0MsTUFBTSxFQUFFLEdBQUcsSUFBSSxLQUFLLENBQUMsdUJBQXVCLENBQUMsSUFBSSxFQUFFLElBQUksRUFBRTtZQUN2RCxHQUFHO1lBQ0gsY0FBYyxFQUFFLElBQUk7U0FDckIsQ0FBQyxDQUFDO1FBQ0gsTUFBTSxRQUFRLEdBQUcsRUFBRSxDQUFDLFdBQVcsQ0FBQyxVQUFVLEVBQUU7WUFDMUMsSUFBSSxFQUFFLEVBQUU7WUFDUixJQUFJLEVBQUUsSUFBSTtTQUNYLENBQUMsQ0FBQztRQUNILFFBQVEsQ0FBQyxVQUFVLENBQUMsa0JBQWtCLEVBQUU7WUFDdEMsSUFBSSxFQUFFLEVBQUU7WUFDUixPQUFPLEVBQUUsQ0FBQyxHQUFHLENBQUM7WUFDZCxXQUFXLEVBQUU7Z0JBQ1gsSUFBSSxFQUFFLFNBQVM7Z0JBQ2YsUUFBUSxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQzthQUNsQztTQUNGLENBQUMsQ0FBQztRQUVILElBQUksR0FBRyxDQUFDLFNBQVMsQ0FBQyxJQUFJLEVBQUUsaUJBQWlCLEVBQUU7WUFDekMsS0FBSyxFQUFFLEVBQUUsQ0FBQyxtQkFBbUI7U0FDOUIsQ0FBQyxDQUFDO0lBR0wsQ0FBQztDQUNGO0FBR0QsTUFBTSxHQUFHLEdBQUcsSUFBSSxHQUFHLENBQUMsR0FBRyxFQUFFLENBQUM7QUFFMUIsSUFBSSxnQkFBZ0IsQ0FBQyxHQUFHLEVBQUUsVUFBVSxHQUFHLE9BQU8sQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgY2RrID0gcmVxdWlyZSgnQGF3cy1jZGsvY29yZScpO1xuaW1wb3J0IGlhbSA9IHJlcXVpcmUoJ0Bhd3MtY2RrL2F3cy1pYW0nKTtcbmltcG9ydCByZHMgPSByZXF1aXJlKCdAYXdzLWNkay9hd3MtcmRzJyk7XG5pbXBvcnQgZWMyID0gcmVxdWlyZSgnQGF3cy1jZGsvYXdzLWVjMicpO1xuaW1wb3J0IGF1dG9zY2FsaW5nID0gcmVxdWlyZSgnQGF3cy1jZGsvYXdzLWF1dG9zY2FsaW5nJyk7XG5pbXBvcnQgZWxidjIgPSByZXF1aXJlKCdAYXdzLWNkay9hd3MtZWxhc3RpY2xvYWRiYWxhbmNpbmd2MicpO1xuXG5jbGFzcyBTaW1wbGVzdFdlYlN0YWNrIGV4dGVuZHMgY2RrLlN0YWNrIHtcbiAgY29uc3RydWN0b3Ioc2NvcGU6IGNkay5BcHAsIGlkOiBzdHJpbmcsIHByb3BzPzogY2RrLlN0YWNrUHJvcHMpIHtcbiAgICBzdXBlcihzY29wZSwgaWQsIHByb3BzKTtcblxuICAgIGNvbnN0IHZwYyA9IG5ldyBlYzIuVnBjKHRoaXMsICdWUEMnKTtcblxuICAgIGNvbnN0IHByaXZhdGVTdWJuZXRzID0gdnBjLnNlbGVjdFN1Ym5ldHMoe3N1Ym5ldFR5cGU6IGVjMi5TdWJuZXRUeXBlLlBSSVZBVEVfV0lUSF9OQVR9KTtcblxuICAgIGNvbnN0IHVzZXJEYXRhID0gZWMyLlVzZXJEYXRhLmN1c3RvbShcbmAjIS9iaW4vc2hcblxuc3VkbyBhcHQgdXBkYXRlXG5cbiMgY2xvdWQgZGVwbG95IGFnZW50XG5hcHQgaW5zdGFsbCAteSBydWJ5LWZ1bGwgd2dldFxuY2QgL2hvbWUvdWJ1bnR1XG53Z2V0IGh0dHBzOi8vYXdzLWNvZGVkZXBsb3ktZXUtd2VzdC0xLnMzLmV1LXdlc3QtMS5hbWF6b25hd3MuY29tL2xhdGVzdC9pbnN0YWxsXG5jaG1vZCAreCAuL2luc3RhbGxcbi4vaW5zdGFsbCBhdXRvID4gL3RtcC9sb2dmaWxlXG5zZXJ2aWNlIGNvZGVkZXBsb3ktYWdlbnQgc3RhdHVzXG5cbiMgcG9rZW1vblxuc3VkbyBhcHQgaW5zdGFsbCBvcGVuamRrLTgtanJlLWhlYWRsZXNzIC15XG53Z2V0IGh0dHBzOi8vZ2l0aHViLmNvbS9jaWJlcmFkby9wb2tlbW9uL3JlbGVhc2VzL2Rvd25sb2FkL3N0cmVzcy9wb2tlbW9uLTAuMC40LVNOQVBTSE9ULmphclxuamF2YSAtamFyIHBva2Vtb24tMC4wLjQtU05BUFNIT1QuamFyXG5cbmApO1xuICAgIGNvbnN0IGFtaSA9IGVjMi5NYWNoaW5lSW1hZ2UuZ2VuZXJpY0xpbnV4KHtcbiAgICAgICdldS13ZXN0LTEnOiAnYW1pLTAyMGZjMzk5YzMxMDA5YjUwJyxcbiAgICAgICdldS1jZW50cmFsLTEnOiAnYW1pLTAyMTUzNzFmM2VhNDlhOTFiJ1xuICAgIH0pO1xuICAgIGNvbnN0IGFzZyA9IG5ldyBhdXRvc2NhbGluZy5BdXRvU2NhbGluZ0dyb3VwKHRoaXMsICdQb2tlbW9uQVNHJywge1xuICAgICAgdnBjLFxuICAgICAgaW5zdGFuY2VUeXBlOiBlYzIuSW5zdGFuY2VUeXBlLm9mKGVjMi5JbnN0YW5jZUNsYXNzLlQzLCBlYzIuSW5zdGFuY2VTaXplLk1JQ1JPKSxcbiAgICAgIG1hY2hpbmVJbWFnZTogYW1pLFxuICAgICAgdXNlckRhdGE6IHVzZXJEYXRhLFxuICAgICAgdnBjU3VibmV0czogcHJpdmF0ZVN1Ym5ldHMsXG4gICAgICBtYXhDYXBhY2l0eTogNCxcbiAgICAgIG1pbkNhcGFjaXR5OiAxXG4gICAgfSk7XG4gICAgYXNnLnJvbGUuYWRkTWFuYWdlZFBvbGljeShcbiAgICAgIGlhbS5NYW5hZ2VkUG9saWN5LmZyb21Bd3NNYW5hZ2VkUG9saWN5TmFtZSgnQW1hem9uU1NNTWFuYWdlZEluc3RhbmNlQ29yZScpXG4gICAgKTtcblxuICAgIGNvbnN0IHBvc3RncmVzID0gbmV3IHJkcy5EYXRhYmFzZUluc3RhbmNlKHRoaXMsICdwb2tlbW9uREJNYWluJywge1xuICAgICAgZW5naW5lIDogcmRzLkRhdGFiYXNlSW5zdGFuY2VFbmdpbmUucG9zdGdyZXMoe1xuICAgICAgICB2ZXJzaW9uOiByZHMuUG9zdGdyZXNFbmdpbmVWZXJzaW9uLlZFUl8xMl80LFxuICAgICAgfSksICAgICAgIFxuICAgICAgZGVsZXRpb25Qcm90ZWN0aW9uIDogZmFsc2UsXG4gICAgICBtdWx0aUF6IDogZmFsc2UsXG4gICAgICB2cGMgOiB2cGMsXG4gICAgICBpbnN0YW5jZUlkZW50aWZpZXIgOiAncG9rZW1vbkRCTWFpbkluc3RhbmNlJyxcbiAgICAgIHZwY1N1Ym5ldHMgOiBwcml2YXRlU3VibmV0cyxcbiAgICAgIGNyZWRlbnRpYWxzIDoge1xuICAgICAgICB1c2VybmFtZSA6ICdhZG1pbicsXG4gICAgICAgIHBhc3N3b3JkIDogY2RrLlNlY3JldFZhbHVlLnBsYWluVGV4dCgnc3VwZXJzZWNyZXQnKVxuICAgICAgfVxuICAgIH0pO1xuICAgIHBvc3RncmVzLmNvbm5lY3Rpb25zLmFsbG93RGVmYXVsdFBvcnRGcm9tKGFzZyk7XG5cbiAgICBjb25zdCBsYiA9IG5ldyBlbGJ2Mi5BcHBsaWNhdGlvbkxvYWRCYWxhbmNlcih0aGlzLCAnTEInLCB7XG4gICAgICB2cGMsXG4gICAgICBpbnRlcm5ldEZhY2luZzogdHJ1ZVxuICAgIH0pO1xuICAgIGNvbnN0IGxpc3RlbmVyID0gbGIuYWRkTGlzdGVuZXIoJ0xpc3RlbmVyJywge1xuICAgICAgcG9ydDogODAsXG4gICAgICBvcGVuOiB0cnVlLFxuICAgIH0pOyAgIFxuICAgIGxpc3RlbmVyLmFkZFRhcmdldHMoJ1NpbXBsZXN0V2ViRmxlZXQnLCB7XG4gICAgICBwb3J0OiA4MCxcbiAgICAgIHRhcmdldHM6IFthc2ddLFxuICAgICAgaGVhbHRoQ2hlY2s6IHtcbiAgICAgICAgcGF0aDogJy9oZWFsdGgnLFxuICAgICAgICBpbnRlcnZhbDogY2RrLkR1cmF0aW9uLm1pbnV0ZXMoMSksXG4gICAgICB9XG4gICAgfSk7XG5cbiAgICBuZXcgY2RrLkNmbk91dHB1dCh0aGlzLCAnTG9hZEJhbGFuY2VyRE5TJywge1xuICAgICAgdmFsdWU6IGxiLmxvYWRCYWxhbmNlckRuc05hbWVcbiAgICB9KTtcblxuXG4gIH1cbn1cblxuXG5jb25zdCBhcHAgPSBuZXcgY2RrLkFwcCgpO1xuXG5uZXcgU2ltcGxlc3RXZWJTdGFjayhhcHAsICdwb2tlbW9uLScgKyBwcm9jZXNzLmVudi5VU0VSKTtcbiJdfQ==