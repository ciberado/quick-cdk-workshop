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

* Get the project source code:

```bash
git clone https://github.com/ciberado/quick-cdk-workshop
cd quick-cdk-workshop/demoasg
npm install
```

* Replace the name of the stack:

```bash
PREFIX=<put_your_own_prefix_here>
sed -i "s/PokemonStack/${PREFIX}PokemonStack/g" index.js
```
* Deploy it:

```bash
export AWS_DEFAULT_REGION=eu-west-1
cdk bootstrap
cdk diff
cdk deploy
```

* Check for the outputs:

```bash
STACK_NAME=$(cdk ls)
aws cloudformation describe-stacks \
  --stack-name $STACK_NAME \
  --region eu-west-1 \
  --query Stacks[0].Outputs \
  --output table
```

* Clean up everything

```bash
cdk destroy
```

## Fargate service with ALB

* Get the project source code:

```bash
git clone https://github.com/ciberado/quick-cdk-workshop
cd quick-cdk-workshop/demofargate
npm install
```

* Replace the name of the stack:

```bash
PREFIX=<put_your_own_prefix_here>
sed -i "s/FargatePokemonStack/${PREFIX}FargatePokemonStack/g" index.ts
```

* Compile typescript to js:

```bash
npm run build
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


For more information, visit the complete [CDK workshop](https://cdkworkshop.com) and the [official examples](https://github.com/aws-samples/aws-cdk-examples).

