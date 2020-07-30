# aws-resource-cleaner

CLI tool to delete all resources for a given AWS service in a given AWS region. 

# WARNING!

Use this script at your own risk! It's meant for personal test accounts.

# Usage

1. Clone the repo:

  ```sh
  git clone https://github.com/matwerber1/aws-resource-deleter
  ```

2. Move into directory:

  ```sh
  cd aws-resource-deleter
  ```

3. Install dependencies:

  ```sh
  npm install
  ```

4. Run the tool:

```sh
./aws-clean.js --service <SERVICE> --region <REGION>
```

Supported values for services are below: 

* **dynamodb-tables**
* **glue-jobs**

I will add more, but its very easy to extend this yourself! read below.

## How to add new functionality

This script is cool (I think) in the sense that it is built to be easily extensible for additional resources you want to delete. 

You simple need to update the `apiMap` object to add new functionality for a given service, rather than adding to add a new list or delete function for each new resource. 

Example: 

```js
 var apiMap = {
  "dynamodb-tables": {
    sdkConstructor: 'DynamoDB',
    list: {
      functionName: "listTables",
      responseProperty: "TableNames",
      nextTokenRequestKey: "ExclusiveStartTableName",
      nextTokenResponseKey: "LastEvaluatedTableName",
    },
    delete: {
      functionName: "deleteTable",
      resourceProperty: "TableName",
      responseProperty: "TableDescription.TableStatus",
    }
   },
   ...
```

**apiMap explanation:**

* The top-level keys, such as "dynamodb-tables" can be named whatever you want. 

  * each top-level key contains three required keys: 

    * **sdkConstructor:** this must match the service constructor per the [AWS SDK for Javascript](https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS.html)

    * **list**: info needed for listing the given AWS resources

      * **functionName** - the AWS SDK API call needed to list resources, e.g. `listTables` for DynamoDB
      
      * **responseProperty** - the property containing the array of resources returned by the list `functionName`
      
      * **nextTokenRequestKey** - when you call an AWS list API, it returns a "nextToken" that you can use to make subsequent requests, since a single list command typically limits responses to a certain number. This is **usually** called `NextToken`, but some AWS services in the SDK use a different value, such as `LastEvaluatedTableName` for the DynamoDB `ListTables` API. Since the value can change, we need to make sure the right one for a given API. 

      * **nextTokenResponseKey** - same concept as above. The API responses from listing resources may return an array of resources with different property names, such as `Tables` or `Instances`.
      
    * **delete**: info needed for deleting the given AWS resources

      * **functionName** - the AWS SDK Javascript function that deletes the resource type in question.  
      * **resourceProperty** - this is the parameter that you pass to the delete function, e.g. `TableName` or `InstanceId`.
      