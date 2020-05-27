# Quick and dirty CDK workshop

* Install `node`

```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.35.3/install.sh | bash
source .bashrc
nvm install 12.16.3

node --version
npm --version
```

* Install the CDK cli

```bash
npm install -g aws-cdk
```

* Create the application 

```bash
export PREFIX=<your prefix>
mkdir $PREFIX && cd $PREFIX

# We will init everything manually this time
# cdk init app --language javascript

npm init
```

* Install dependencies

```bash
npm install --save \
  @aws-cdk/core \
  @aws-cdk/aws-ec2 
```

* Create the stack script


```bash
cat << EOF > index.js
const cdk = require('@aws-cdk/core');
const ec2 = require('@aws-cdk/aws-ec2');

class SimpleDemoStack extends cdk.Stack {
  constructor(app, id) {
    super(app, id);
    const vpc = new ec2.Vpc(this, 'VPC');
  }
}

const app = new cdk.App();
new SimpleDemoStack(app, '${PREFIX}SimpleDemoStack');
EOF
```

* Configure the CDK

```bash
cat << EOF > cdk.json
{
  "app" : "node index"
}
EOF
```

* Generate the cloudformation template

```bash
cdk synth
cat cdk.out/*.json
```

* Set the deployment region

```
export AWS_DEFAULT_REGION=eu-west-1
```

* Init the CDK infrastructure

```bash
cdk bootstrap
```

* Check what resources are going to be created

```bash
cdk diff
```

* Deploy all things!

```bash
cdk deploy
```

* Include a security group, if you are inclined to do so:

```bash
cat << EOF > index.js
const cdk = require('@aws-cdk/core');
const ec2 = require('@aws-cdk/aws-ec2');


class SimpleDemoStack extends cdk.Stack {
  constructor(app, id) {
    super(app, id);
    const vpc = new ec2.Vpc(this, 'VPC');
    
    const webSecurityGroup = new ec2.SecurityGroup(this, 'webSecurityGroup', {
      description: 'Allow access to webservers',
      groupName: 'sgweb',
      vpc: vpc
    });
    webSecurityGroup.addIngressRule(new ec2.AnyIPv4(), new ec2.TcpPort(80), 'allow http access from any ip');
    webSecurityGroup.addIngressRule(new ec2.AnyIPv4(), new ec2.TcpPort(443), 'allow https access from any ip');
  }
}

const app = new cdk.App();
new SimpleDemoStack(app, '${PREFIX}SimpleDemoStack');
EOF
```


* Clean the house

```bash
cdk destroy
```

## RDS + ASG + ELB (classic) example

* Repeat the project creation process:

```bash
cd
export PREFIX=<your prefix>
mkdir $PREFIX && cd $PREFIX
npm init
npm install --save \
  @aws-cdk/core \
  @aws-cdk/aws-ec2 \
  @aws-cdk/aws-rds \
  @aws-cdk/aws-autoscaling \
  @@aws-cdk/aws-elasticloadbalancing
```

* Write the program:

```javascript
cat << EOF > index.js
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
      vpcSubnets: privateSubnets
    });

    const mySql = new RDS.DatabaseInstance(this, "pokemonDBMain", {
        engine : RDS.DatabaseInstanceEngine.MYSQL,
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
  }
}

const app = new cdk.App();
new StandardDemoStack(app, '${PREFIX}StandardDemoStack');

EOF
```
* Deploy it:

```bash
export AWS_DEFAULT_REGION=eu-west-1
cdk bootstrap
cdk diff
cdk deploy
```

* Clean up everything

```bash
cdk destroy
```

For more information, visit the complete [CDK workshop](https://cdkworkshop.com).

