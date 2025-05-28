#!/usr/bin/env node
import fs from "node:fs/promises";
import path from "node:path";
import upyun from "upyun";
const [BUCKET, DIRECTORY] = process.argv.slice(2);
const { UPYUN_OPERATOR, UPYUN_PASSWORD } = process.env;
const packageInfo = JSON.parse(await fs.readFile(new URL("../package.json", import.meta.url), "utf8"));
const { version } = packageInfo;
if (process.argv.includes("-v") || process.argv.includes("--version")) {
    console.info(version);
    process.exit(0);
}
console.info("UPYUN Uploader " + version);
if (!BUCKET || !DIRECTORY) {
    console.error("Usage: upyun-uploader <bucket> <directory>");
    process.exit(1);
}
if (!UPYUN_OPERATOR || !UPYUN_PASSWORD) {
    console.error("Missing UPYUN credentials in environment variables");
    if (!UPYUN_OPERATOR) {
        console.error("UPYUN_OPERATOR is not set");
    }
    if (!UPYUN_PASSWORD) {
        console.error("UPYUN_PASSWORD is not set");
    }
    process.exit(1);
}
const fullPath = path.resolve(DIRECTORY);
if (fullPath.split(path.sep).at(-1) === ".git") {
    console.error("Cannot upload .git directory");
    process.exit(1);
}
const cwd = process.cwd();
const isDelayMode = process.argv.includes("--delay");
const service = new upyun.Service(BUCKET, UPYUN_OPERATOR, UPYUN_PASSWORD);
const client = new upyun.Client(service);
const uploadedKeys = [];
async function cleanRemoteDir(dir) {
    try {
        const response = await client.listDir(dir);
        if (!response) {
            console.error("Failed to list remote files in", dir);
            process.exit(1);
        }
        for (const file of response.files) {
            const remotePath = path.join(dir, file.name).replace(/^\//, "");
            console.info("Checking", remotePath);
            if (file.type === "N") {
                // is file
                if (!uploadedKeys.includes(remotePath)) {
                    console.info("Deleting", remotePath);
                    await client.deleteFile(remotePath);
                }
            }
            else if (file.type === "F") {
                // is directory
                await cleanRemoteDir(remotePath);
            }
            else {
                console.error("Unknown file type", file);
                process.exit(1);
            }
        }
    }
    catch (error) {
        console.error("Failed to clean remote files in", dir);
        console.error(error);
        process.exit(1);
    }
}
async function readLocalDir(dir, results) {
    try {
        const files = await fs.readdir(dir);
        for (const file of files) {
            if (file.startsWith(".")) {
                continue;
            }
            const filename = path.join(dir, file);
            const stat = await fs.stat(filename);
            if (stat.isDirectory()) {
                await readLocalDir(filename, results);
            }
            else if (stat.isFile()) {
                results.push(filename);
            }
        }
    }
    catch (error) {
        console.error("Failed to read local files in", dir);
        console.error(error);
        process.exit(1);
    }
}
function sleep(delay) {
    return new Promise((resolve) => {
        setTimeout(resolve, delay);
    });
}
async function uploadFile(filename) {
    if (!filename) {
        console.error("Empty filename provided");
        return;
    }
    const filenameParts = filename.substring(fullPath.length).split(path.sep);
    const key = filenameParts.slice(1).join("/");
    console.info("Uploading", key);
    const fileContent = await fs.readFile(filename);
    await client.putFile(key, fileContent);
    uploadedKeys.push(key);
}
void (async () => {
    try {
        console.info("Current working directory:", cwd);
        const filesToUpload = [];
        await readLocalDir(fullPath, filesToUpload);
        if (filesToUpload.length === 0) {
            console.error("No files to upload");
            process.exit(1);
        }
        const delayedFiles = [];
        for (const filename of filesToUpload) {
            if (isDelayMode &&
                (filename.endsWith(".html") || filename.endsWith("sw.js"))) {
                delayedFiles.push(filename);
                continue;
            }
            await uploadFile(filename);
        }
        if (isDelayMode && delayedFiles.length > 0) {
            console.info("Delay mode is enabled, waiting for 5 minutes");
            await sleep(300_000);
            for (const filename of delayedFiles) {
                await uploadFile(filename);
            }
        }
        console.info("All files uploaded!");
        console.info("Cleaning up");
        await cleanRemoteDir("/");
        console.info("All done!");
        process.exit(0);
    }
    catch (error) {
        console.error("Failed to deploy");
        console.error(error);
        process.exit(1);
    }
})();
