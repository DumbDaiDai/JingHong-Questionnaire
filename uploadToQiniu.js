import qiniu from 'qiniu';
import path from 'path';
import fs from 'fs';


const accessKey = ${{ secrets.AK }};
const secretKey = ${{ secrets.SK }};
const bucket = ${{ secrets.BUCKET }};  
const baseDir = path.resolve('dist');  
const uploadPathPrefix = ${{ secrets.PATH }};  


const mac = new qiniu.auth.digest.Mac(accessKey, secretKey);
const options = {
    scope: bucket,
};
new qiniu.rs.PutPolicy(options);

const config = new qiniu.conf.Config();
config.zone = qiniu.zone.Zone_z0;  

const formUploader = new qiniu.form_up.FormUploader(config);
const putExtra = new qiniu.form_up.PutExtra();

function uploadFile(localFile, key) {
    return new Promise((resolve, reject) => {

        const options = {
            scope: bucket + ':' + key, 
            force: true
        };
        const putPolicy = new qiniu.rs.PutPolicy(options);
        const uploadToken = putPolicy.uploadToken(mac);

        formUploader.putFile(uploadToken, key, localFile, putExtra, function(respErr, respBody, respInfo) {
            if (respErr) {
                reject(respErr);
            } else {
                if (respInfo.statusCode === 200) {
                    resolve(respBody);
                } else {
                    reject(respInfo);
                }
            }
        });
    });
}


// 遍历 dist 目录并上传所有文件
async function uploadDirectory(directory) {
    const files = fs.readdirSync(directory);
    for (const file of files) {
        const fullPath = path.join(directory, file);
        const stat = fs.statSync(fullPath);
        if (stat.isFile()) {
            const key = uploadPathPrefix + path.relative(baseDir, fullPath).replace(/\\/g, '/');
            try {
                const result = await uploadFile(fullPath, key);
                console.log(`Uploaded ${key}:`, result);
            } catch (err) {
                console.error(`Failed to upload ${key}:`, err);
            }
        } else if (stat.isDirectory()) {
            await uploadDirectory(fullPath);
        }
    }
}

// 执行上传
uploadDirectory(baseDir).then(() => {
    console.log('All files uploaded successfully');
}).catch(err => {
    console.error('Error uploading files:', err);
});
