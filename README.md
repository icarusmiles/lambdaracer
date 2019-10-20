# 💸 Lambda Cost Analyzer
Lambda Cost Analyzer is a simple lightweight script that can be ran on a client or inside a CI/CD environment. You can define a lambda function name and choose a bundle of memory sizes to test speed and cost. The output will compare and breakdown the costs per memorysize for your function, optionally you can output as JSON for CI/CD. Prices are pulled from AWS API

#### 💾 Installation

**🖥️ Requirements**
* Node v6+
* IAM Role with `lambda:GetFunctionConfiguration`, `lambda:InvokeFunction`, and `pricing:GetProducts`

**📜 Install**
1. `git clone https://github.com/icarusmiles/lambda-cost-analyzer.git`
2. `cd lambda-cost-analyzer`
3. `npm install`

#### ⌨️ Usage

`npm run start -- --function <name>`

| Flag            | Description | Required | Default Value
| --------------- | ----------------------- | ----------------------- |
| -f, --function  | Input                 | Yes | N/A
| --freetier      | In price calculations includes AWS Free tier  | No | `false`
| -r, --requests  | Number of requests to calculate final pricing  | No  | `5000`  |
| -w, --warmups   | Number of warmup runs before performance testing (Recommend minimum of 2)  | No  | `3`  |
| -t, --tests     | Number of test performance runs to calculate average speed (ms)  | No  | `4`  |
| -s, --suite     | The bundle "name" of memory sizes to test against  | No | `general`  |
| -o, --out       | Output json file of final results, `output.json`  | No  | `false`  |
| -d, --debug     | Adds verbose logging, please use if making an issue  | No | `false`

## License

*Open source license*

If you are creating an open source application under a license compatible with the GNU GPL license v3, you may use Lambda Cost Analyzer under the terms of the GPLv3. You can read more about this license [here](https://www.gnu.org/licenses/quick-guide-gplv3.en.html).
