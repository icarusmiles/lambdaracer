const commander = require('commander');
const AWS = require('aws-sdk');
AWS.config.region = commander.region ? commander.region : 'us-east-1';
const colors = require('colors');
const lambda = new AWS.Lambda();
const pricing = new AWS.Pricing({ apiVersion: '2017-10-15' });
const fs = require('fs');


/* Grab flags from CLI */
commander
  .usage('[OPTIONS]...')
  .option('-f, --function <name>')
  .option('-d, --debug')
  .option('--freetier')
  .option('-r, --requests <number>')
  .option('-w, --warmups <number>')
  .option('-t, --tests <number>')
  .option('-s, --suite <name>')
  .option('-o, --out')
  .parse(process.argv);

/* Params */
const debug = commander.debug; /* If -d, enable verbose logging */
const functionName = commander.function;
const warmup_count = commander.warmups ? commander.warmups : 3;
const test_count = commander.tests ? commander.tests : 4;
const requests = commander.requests ? commander.requests : 5000;
const suiteTier = commander.suite ? commander.suite : "general"
const saveJson = commander.out;
var originalMemory;
var tests = {};
var output = [];
var json = [];


/* Suite of tests to run */
testSuites = {
  "general": ["128", "256", "512", "1024", "1536", "2048", "2560", "3008"],
  "test": ["128", "256"],
  "lowest": ["128", "256", "320", "384", "448"],
  "low": ["512", "576", "640", "704", "768", "832", "896"],
  "medium": ["960", "1024", "1088", "1152", "1216", "1280", "1344"],
  "high": ["1408", "1472", "1536", "1600", "1644", "1728", "1792"],
  "higher": ["1856", "1920", "1984", "2048", "2112", "2176", "2240"],
  "highest": ["2304", "2368", "2432", "2496", "2560", "2624", "2688", "2752", "2816", "2880", "2944", "3008"]
}

testSuites["full"] = testSuites["lowest"]
  .concat(testSuites["low"],
    testSuites["medium"],
    testSuites["high"],
    testSuites["higher"],
    testSuites["highest"])

/******************************************/
/********* Grab function details  *********/
/******************************************/

async function loadFunction(FunctionName) {
  /* Get function details */
  let functionConfig = await lambda.getFunctionConfiguration({ FunctionName }).promise();
  console.log(colors.yellow('Function Loaded:'), functionConfig.FunctionName);
  console.log(colors.yellow('Current Configuruation:'))
  console.table({
    "Name": functionConfig.FunctionName,
    "Runtime": functionConfig.Runtime,
    "Timeout": functionConfig.Timeout + "s",
    "Memory": functionConfig.MemorySize + " MB"
  });
  console.log('\n------------------------------------------------\n');
  return functionConfig;
}

/******************************************/
/********* Run Performance Test  *********/
/*****************************************/

async function runTest(functionName, warmup) {

  var params = {
    FunctionName: commander.function,
    InvocationType: 'RequestResponse',
    LogType: "Tail",
    // Payload: '{ "name" : "Alex" }'
  };

  try {
    let invoke = await lambda.invoke(params).promise();
    if (debug) {
      console.log(invoke);
    }

    if (invoke.StatusCode == "200") {
      var decoded = new Buffer.from(invoke.LogResult, 'base64').toString('ascii');
      if (debug) {
        console.log(decoded);
      }
      let regex = /Duration:(?<actualTime>[.\d]+)msBilledDuration:(?<billedTime>[.\d]+)msMemorySize:(?<memorySize>[.\d]+)MB/
      let singleLine = decoded.replace(/\s/g, "");
      let found = singleLine.match(regex).groups;
      console.log(colors.green("Lambda Success!"), `Completed in ${found.actualTime}ms, billed for ${found.billedTime}ms @ ${found.memorySize} MB`);
      if (warmup == false) {
        tests[found.memorySize].push(Number(found.billedTime));
      }
    }
  } catch (err) {
    console.error(err);
  }

}


/**********************************/
/********* Update Memory  *********/
/**********************************/

async function updateMemory(FunctionName, MemorySize) {
  try {
    let updateMemory = await lambda.updateFunctionConfiguration({
      FunctionName,
      MemorySize
    }).promise();
    console.log("🐏  Updated RAM to", MemorySize, "MB");
    return updateMemory;
  } catch (err) {
    console.error(err);
  }

}

/*****************************/
/********* Run Suite *********/
/****************************/

async function runSuite(functionName, memorySize) {
  await updateMemory(functionName, memorySize);

  console.log("\n🔥 Running warmup tests for accurate non-cold start readings!");


  for (let i = 0; i < warmup_count; i++) {
    await runTest(functionName, true);
  }

  console.log("\n\n🏎️   Performance Test Started!")
  for (i = 0; i < test_count; i++) {
    await runTest(functionName, false);
  }
  console.log("\n------------------------------------------------\n")
}


/************************************/
/********* Analyze/compare  *********/
/************************************/
async function analyze(suite, price) {

  for (memorySize in tests) {
    let sum = tests[memorySize].reduce((previous, current) => current += previous);
    let avg = sum / tests[memorySize].length;
    let avg_billable = Math.ceil(avg / 100) * 100
    let totalComputeSecs = requests * (avg_billable / 1000.0);
    let totalComputeGb = totalComputeSecs * (Number(memorySize) / 1024);
    let totalCost = commander.freetier ? price * (totalComputeGb - 400000) : price * totalComputeGb


    output.push({
      "Memory Size (mb)": Number(memorySize),
      "Average Billable Speed (ms)": avg,
      "Calculated Billable Speed (ms)": avg_billable,
      "Cost ($)": Number(Math.max(0, totalCost).toFixed(6)),
      "Raw Cost ($)": Math.max(0, totalCost)
    });

    if (saveJson) {
      json.push({
        "memory": Number(memorySize),
        "billableTime": avg_billable,
        "cost": Math.max(0, totalCost)
      })
    }
  }
  console.log("\n" + colors.white(`Cost analysis based on ${requests} requests`))
  console.table(output);
  if (saveJson) {
    fs.writeFile("output.json", JSON.stringify(json), function(err) {
      if (err) {
        console.log(err);
      }
    });
  }
}

/*********************************************/
/********* Fetch latest Lambda cost  *********/
/*********************************************/
async function getLambdaPrice() {
  let result = await pricing.getProducts({
    Filters: [{
      Field: 'usagetype',
      Type: "TERM_MATCH",
      Value: 'USE2-Lambda-GB-Second'
    }],
    ServiceCode: 'AWSLambda'
  }).promise();

  return result.PriceList[0].terms.OnDemand["3BYZH4NKJN8TJUQ6.JRTCKXETXF"].priceDimensions["3BYZH4NKJN8TJUQ6.JRTCKXETXF.6YS6EN2CT7"].pricePerUnit.USD;
}

/*************************/
/********* Init  *********/
/*************************/
(async () => {

  if (commander.function) {
    let func = await loadFunction(commander.function);
    originalMemory = func.MemorySize; /* Remember original memory, update to that later */
    let suite = testSuites[suiteTier];

    for (let i = 0; i < suite.length; i++) {
      tests[suite[i]] = []
    }


    for (let i = 0; i < suite.length; i++) {
      await runSuite(func.FunctionName, suite[i])
    }

    await updateMemory(func.FunctionName, originalMemory);

    await analyze(suite, await getLambdaPrice());
  } else {
    console.error("Please define a function name with -f <name> or --function <name>")
  }
})()