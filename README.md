Firstly, make sure you have AWS CDK installed. If not, you can install it using npm:

```
npm install -g aws-cdk
```

Next, create a new directory and initialize a new CDK project:

```
mkdir my-cdk-app
cd my-cdk-app
cdk init --language=typescript
```

This will create a new CDK project with TypeScript as the programming language. You can also use other languages such as Python, Java, or C#.

Now, let's add dependencies for AWS EC2 and AWS SSM:

```
npm install @aws-cdk/aws-ec2 @aws-cdk/aws-ssm
```

We'll use AWS EC2 for creating the instance and AWS SSM to add a parameter containing the script to install Jenkins.

Replace the content of `lib/my-cdk-app-stack.ts` with the following:

```typescript
import * as cdk from '@aws-cdk/core';
import * as ec2 from '@aws-cdk/aws-ec2';
import * as ssm from '@aws-cdk/aws-ssm';

export class MyCdkAppStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const vpc = new ec2.Vpc(this, 'Vpc', { maxAzs: 2 });

    const installScript = `#!/bin/bash
    sudo yum update -y
    sudo yum install -y java-1.8.0
    sudo yum remove -y java-1.7.0-openjdk
    sudo wget -O /etc/yum.repos.d/jenkins.repo http://pkg.jenkins-ci.org/redhat/jenkins.repo
    sudo rpm --import https://jenkins-ci.org/redhat/jenkins-ci.org.key
    sudo yum install -y jenkins
    sudo service jenkins start
    `;

    const scriptSsmParameter = new ssm.StringParameter(this, 'ScriptParameter', {
      parameterName: '/scripts/jenkins-install',
      stringValue: installScript,
    });

    const linuxAmi = new ec2.AmazonLinuxImage({
      generation: ec2.AmazonLinuxGeneration.AMAZON_LINUX_2,
    });

    new ec2.Instance(this, 'Instance', {
      vpc,
      instanceType: ec2.InstanceType.of(ec2.InstanceClass.T2, ec2.InstanceSize.MICRO),
      machineImage: linuxAmi,
      userData: ec2.UserData.custom(`sudo aws ssm get-parameter --name ${scriptSsmParameter.parameterName} --with-decryption --region ${this.region} --query Parameter.Value --output text | bash -`),
    });
  }
}
```

This code does the following:

1. Creates a new VPC with two Availability Zones.
2. Defines a script to install Jenkins. The script updates the system, installs Java 8, adds the Jenkins repository, imports the Jenkins key, installs Jenkins, and starts the Jenkins service.
3. Saves the script in an SSM Parameter.
4. Creates a new EC2 instance in the VPC. It uses Amazon Linux 2 as the AMI and t2.micro as the instance type. It also uses the script from the SSM Parameter as the user data.

Finally, compile and deploy the stack:

```
npm run build
cdk deploy
```

This will create a CloudFormation stack with the resources defined in the CDK app.

After the deployment completes, you'll have an EC2


In the example provided, the EC2 instance is launched in a VPC without a public IP assigned, so the Jenkins application will not be accessible from the internet directly.

If you want the instance to be accessible from the internet, you need to make a few adjustments:

1. Assign a public IP to the instance.
2. Open the Jenkins port (by default, it's 8080) in the Security Group associated with the instance.

First, when creating the instance, specify that it should have a public IP:

```typescript
new ec2.Instance(this, 'Instance', {
  vpc,
  instanceType: ec2.InstanceType.of(ec2.InstanceClass.T2, ec2.InstanceSize.MICRO),
  machineImage: linuxAmi,
  userData: ec2.UserData.custom(`sudo aws ssm get-parameter --name ${scriptSsmParameter.parameterName} --with-decryption --region ${this.region} --query Parameter.Value --output text | bash -`),
  vpcSubnets: { subnetType: ec2.SubnetType.PUBLIC },
});
```

Next, create a security group and allow inbound traffic to port 8080:

```typescript
const securityGroup = new ec2.SecurityGroup(this, 'SecurityGroup', {
  vpc,
  description: 'Allow ssh access to ec2 instances',
  allowAllOutbound: true,
});

securityGroup.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(8080), 'Allow Jenkins access from anywhere');
```

And assign this security group to the instance:

```typescript
new ec2.Instance(this, 'Instance', {
  vpc,
  instanceType: ec2.InstanceType.of(ec2.InstanceClass.T2, ec2.InstanceSize.MICRO),
  machineImage: linuxAmi,
  userData: ec2.UserData.custom(`sudo aws ssm get-parameter --name ${scriptSsmParameter.parameterName} --with-decryption --region ${this.region} --query Parameter.Value --output text | bash -`),
  vpcSubnets: { subnetType: ec2.SubnetType.PUBLIC },
  securityGroup: securityGroup,
});
```

With these changes, your Jenkins server will be accessible from the internet. However, keep in mind that this also exposes your Jenkins server to potential threats, so make sure to secure it properly. This includes setting up a proper admin password, disabling signups, and potentially even limiting access to certain IP addresses instead of allowing access from anywhere.

After the instance has been created, you can get its public IP from the AWS Management Console, EC2 Dashboard. Using that IP, you can access Jenkins by going to `http://<public-ip>:8080` in your web browser.

The TypeScript file:
Creates a VPC with 2 availability zones.
Defines a script to install Jenkins.
Stores the script in an AWS SSM Parameter.
Creates a Security Group that allows inbound traffic on port 8080 (the default Jenkins port).
Creates an EC2 instance with Amazon Linux 2, running the script from the SSM Parameter at startup. The instance is created in a public subnet, so it gets a public IP, and the Security Group allowing inbound traffic on port 8080 is associated with it.
With this setup, the Jenkins server should be accessible from the internet via the public IP of the EC2 instance at port 8080. As mentioned before, please remember to secure your Jenkins server properly, as this configuration allows access from anywhere on the internet.