# Quick and dirty CDK workshop

* Install `node`

```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.35.3/instal
l.sh | bash
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
export CDK_DEFAULT_REGION=eu-west-1
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

For more information, visit the complete [CDK workshop](https://cdkworkshop.com).

