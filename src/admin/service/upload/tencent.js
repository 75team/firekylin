const fs = require('fs');
const path = require('path');
const COS = require('cos-nodejs-sdk-v5');
const Base = require('./base');

const readFileAsync = think.promisify(fs.readFile);
const statAsync = think.promisify(fs.stat);
module.exports = class extends Base {
  // 导入方法
  async uploadMethod(filename, config) {
    const { SecretId, SecretKey, bucket, region, origin, file, prefix } = config;
    // 创建实例
    const cos = new COS({
      SecretId,
      SecretKey,
    });
    const putObjectAsync = think.promisify(cos.putObject);
    let savePath = this.getSavePath(filename, prefix);
    if (!path.extname(savePath)) {
      savePath += path.extname(file.name);
    }
    const fileData = await readFileAsync(filename);
    const { size } = await statAsync(filename);
    const result = await putObjectAsync({
      Bucket: bucket,
      Region: region,
      Key: savePath,
      Body: fileData,
      ContentLength: size,
    });
    // result.Location
    const absOrigin = this.getAbsOrigin(origin);
    const compeletePath = `${absOrigin}/${savePath}`;
    return compeletePath;
  }

  // 执行方法
  async run(file, config) {
    return await this.upload(file, config);
  }
};
