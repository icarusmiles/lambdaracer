## 🏎️ LambdaRacer
LambdaRacer is a simple lightweight script that can be ran on a client or inside a CI/CD environment. You can define a lambda function name and choose a bundle of memory sizes to test speed and cost. The output will compare and breakdown the costs per memory size for your function, optionally you can output as JSON for CI/CD. Prices are pulled from AWS API. **During tests LambdaRacer will modify your memory size and revert it back to default**

![Demo](https://raw.githubusercontent.com/icarusmiles/lambdaracer/master/demo/render.gif)






### 🖥️ Requirements
* Node v6+
* IAM Role with `lambda:GetFunctionConfiguration`, `lambda:InvokeFunction`, `lambda:UpdateFunctionConfiguration`, and `pricing:GetProducts`

### 📜 Install
1. `git clone https://github.com/icarusmiles/lambdaracer.git`
2. `cd lambdaracer`
3. `npm install`

### ⌨️ Usage

**Basic Usage**
```
node index.js --function <name>
```

**Advanced Usage**

The below example will warmup your function four times prior to testing, followed by five tests per memory size for our "low" suite (see below). Additionally final cost calculations will take inaccount of the free tier and base it off of 30k requests.
```
node index.js --function helloworld \
--freetier \
--requests 30000 \
--warmups 4 \
--tests 5 \
--suite low
```

**Command-line Flags**

| Flag            | Input | Description                                                                     | Required | Default Value
| --------------- | --------------- | ------------------------------------------------------------------------------- | -------- | ------------ |
| -f, --function  | String | Function name to perform memory resizing and testing                   | Yes                                                    | N/A |
| --freetier      | N/A | In price calculations include AWS Free tier                                     | No | `false` |
| -r, --requests  | Numeric |Number of requests to calculate final pricing                                    | No  | `5000`  |
| -w, --warmups   | Numeric | Number of warmup runs before performance testing (Recommend minimum of 2)        | No  | `3`  |
| -t, --tests     | Numeric | Number of test performance runs to calculate average speed (ms)                  | No  | `4`  |
| -s, --suite     | String | The bundle "name" of memory sizes to test against (see below)                               | No | `general`  |
| -o, --out       | N/A | Output json file of final results, `output.json`                                 | No  | `false`  |
| -d, --debug     | N/A | Adds verbose logging, please use if making an issue                              | No | `false` |
| -p, --payload   | N/A | If toggled `payload.json` will be used during invocation    | No   | `{}`   |


## 🐏 Memory Size Suites

A "suite" is a collection of memory sizes to perform tests against. Memory sizes are adjusted by LambdaRacer using the AWS SDK. Use the `-s` or `--suite` flag, e.g. `--suite medium`

| Suite            | Memory Sizes |
| --------------- | --------------- |
| general  | 128mb, 256mb, 512mb, 1024mb, 1536mb, 2048mb, 2560mb, 3008mb |
| lowest      | 128mb, 256mb, 320mb, 384mb, 448mb |
| low  | 512mb, 576mb, 640mb, 704mb, 768mb, 832mb, 896mb  |
| medium   | 960mb, 1024mb, 1088mb, 1152mb, 1216mb, 1280mb, 1344mb  |
| high     | 1408mb, 1472mb, 1536mb, 1600mb, 1644mb, 1728mb, 1792mb  |
| higher    | 1856mb, 1920mb, 1984mb, 2048mb, 2112mb, 2176mb, 2240mb  |
| highest       | 2304mb, 2368mb, 2432mb, 2496mb, 2560mb, 2624mb, 2688mb, 2752mb, 2816mb, 2880mb, 2944mb, 3008mb  |
| full    | Every possible memory size (Warning: this may take some time) |


## File Output (Optional)
If you're using `-o` or `--out`, the following will be saved as `output.json`:
```
[
  {"memory":128, "billableTime":100, "cost":0 },
  {"memory":256, "billableTime":100, "cost":0 }
]
```

## License

*Open source license*

If you are creating an open source application under a license compatible with the GNU GPL license v3, you may use LambdaRacer under the terms of the GPLv3. You can read more about this license [here](https://www.gnu.org/licenses/quick-guide-gplv3.en.html).
