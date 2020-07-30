#!/usr/bin/env node

var co = require('co');
const prompt = require("async-prompt");
const yargs = require("yargs");
const AWS = require("aws-sdk");
var serviceApi;

const options = yargs
 .usage("Usage: -s <service> -r <region>")
 .option("s", { alias: "service", describe: "service you want to clean", type: "string", demandOption: true })
 .option("r", { alias: "region", describe: "region to clean", type: "string", demandOption: true })
 .argv;

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
    }
   },
   "glue-jobs": {
    sdkConstructor: 'Glue',
    list: {
      functionName: "listJobs",
      responseProperty: "JobNames",
      nextTokenRequestKey: "NextToken",
      nextTokenResponseKey: "NextToken",
      
    },
    delete: {
      functionName: "deleteJob",
      resourceProperty: "JobName",
      responseProperty: "JobName",
    }
  }
};

(async () => {
  try {
    await main();
  }
  catch (e) {
    console.log('Error:', e);
  }
})();

async function main() {

  var service = options.service;
  var region = options.region;

  configureAwsSdk(service, region);

  if (await confirm_clean(service, region)) {
    var resources = await getResources(service, region);
    await deleteResources(resources, service, region);
  }
  else {
    console.log('Clean cancelled by user.');
  }

}

function configureAwsSdk(service, region) {
  AWS.config.update({ region: region });
  var sdkConstructor = `new AWS.${apiMap[service].sdkConstructor}({'region': region})`;
  serviceApi = eval(sdkConstructor);
  
}

//#-----------------------------------------------------------------------------
async function deleteResources(resources, service, region) {

  var myMap = apiMap[service].delete;

  if (resources.length === 0) {
    console.log('No resources to delete.');
    return;
  }

  // Determine which API call we want to make to list resources:
  var deleteResourceFunction = `serviceApi.${myMap.functionName}(params).promise()`;
  var resourceProperty = myMap.resourceProperty;
  
  console.log(`Deleting ${service} resources in ${region}...` );

  var params = {};

  for (const resource of resources) {
    params[resourceProperty] = resource;
    console.log(`Calling ${service}.${myMap.functionName} with parameters ${JSON.stringify(params)}...`);
    var response = await eval(deleteResourceFunction);
  }

  console.log('Finished deleting resources!');
  return resources;
}


//#-----------------------------------------------------------------------------
async function getResources(service, region) {

  var myMap = apiMap[service].list;

  // We will populate this with the resources returned by the List/Get AWS APIs for service requested:
  var resources = [];

  // Determine which API call we want to make to list resources:
  var listResourcesFunction = `serviceApi.${myMap.functionName}(params).promise()`;

  var nextTokenRequestKey = myMap.nextTokenRequestKey;
  var nextTokenResponseKey = myMap.nextTokenResponseKey;

  var params = {};

  do {
    console.log(`Calling ${service}.${myMap.functionName} with parameters ${JSON.stringify(params)}...`);
    var response = await eval(listResourcesFunction);
    var tempResources = eval(`response.${myMap.responseProperty}`);
    resources = resources.concat(tempResources);
    params[nextTokenRequestKey] = response[nextTokenResponseKey];
  } while (response[nextTokenResponseKey]);

  console.log('Resources: \n', JSON.stringify(resources));
  return resources;
}

//#-----------------------------------------------------------------------------
async function confirm_clean(service, region) {

  const response = await prompt(`do you really want to delete all resources for ${service} in ${region}? `);
  const yes = ['y', 'yes', 'ok'];
  return yes.includes(response.toLowerCase());

}