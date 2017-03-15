const express = require('express');
const fetch = require('node-fetch');
const _ = require('lodash');

const API_LINK = (ip) => `http://${ip}/rcp.xml?command=0x0b4a&type=P_OCTET&direction=READ&num=1`;

var camData = [];

const pullCamData = (ipArr) => {
    ipArr.forEach(ip => getCam(ip));
}

const getCam = (ip) => {
fetch(API_LINK(ip)).then(res => res.text()).then(xml => {
    let startIndex = xml.indexOf('<str>');
    let endIndex = xml.indexOf('</str>');
    let result = xml.substring(startIndex+5, endIndex);
    readBuffer(ip, result);
});
}

const readBuffer = (ip, buff) => {
    let regex = /\s+/gi
    let resultBuff = buff.replace(regex, '');
    const myBuff = Buffer.from(resultBuff, 'hex');
    let amountOfData = myBuff[0];
    var buffCount = 1;
    let infoObj = {ip: ip};
    for(var i = 0 ; i< amountOfData ; i++){
        var startCount = buffCount;
        buffCount += 70;
        infoObj = Object.assign({}, infoObj, readSingleValue(myBuff.slice(startCount, buffCount)));
    }
    const indexOfCamObj = _.findIndex(camData, o => o.ip === ip)
    if(indexOfCamObj < 0){
        // not found
        camData.push(infoObj);
    }else{
        camData[indexOfCamObj] = infoObj;
    }
}

const readSingleValue = (buf) => {
    let cap1 = buf.slice(2,66);
    let val1 = buf.slice(66,70);
    let cap1Readable = cap1.toString('ascii');
    cap1Readable = cap1Readable.substring(0, cap1Readable.indexOf(':')); 
    return {[cap1Readable] : val1.readInt32BE()};
}

// get Data from the camera every x ms
const FIRST_CAM = '100.103.1.215';
const SECOND_CAM = '100.103.1.208';
const allCams = [
    '100.103.1.215',
    '100.103.1.208',
    '100.103.1.220',
    '100.103.1.203'
]
setInterval(() => {pullCamData(allCams)}, 300);

const app = express();

app.use('/getAll', (req,res) => {
    var jsonString = JSON.stringify(camData);
    // This is neccessary to strip the unicode characters
    let regex = /\\u0000/gi
    jsonString = jsonString.replace(regex, '');
    res.send(jsonString);
});


app.listen(3000, () => {
    console.log('listening to port 3000');
});
