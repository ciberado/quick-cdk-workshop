import ec2 = require('@aws-cdk/aws-ec2');
import ecs = require('@aws-cdk/aws-ecs');
import ecs_patterns = require('@aws-cdk/aws-ecs-patterns');
import cdk = require('@aws-cdk/core');

class PokemonFargateStack extends cdk.Stack {
  constructor(scope: cdk.App, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const vpc = new ec2.Vpc(this, 'VPC', { maxAzs: 2 });
    const cluster = new ecs.Cluster(this, 'Cluster', { vpc });

    // Instantiate Fargate Service with just cluster and image
    new ecs_patterns.ApplicationLoadBalancedFargateService(this, "FargateService", {
      cluster,
      desiredCount: 2,
      taskImageOptions: {
        image: ecs.ContainerImage.fromRegistry("ciberado/pokemon-nodejs"),
        containerPort: 80
      }
    });
  }
}

const app = new cdk.App();

new PokemonFargateStack(app, 'FargatePokemon');

app.synth();
