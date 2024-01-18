# UPYUN Uploader

The command-line interface for uploading the selected directory to UPYUN Storage Service. This tool is particularly useful in continuous integration and continuous deployment (CI/CD) workflows, such as with GitLab Pipelines.

The content in the bucket will be completely replaced by the content in the selected directory. Any files present in the bucket but not in the local directory will be deleted.

## Installation

Install UPYUN Uploader globally using npm with the following command:

```bash
npm install -g @shangzhen/upyun-uploader
```

## Configuration

Set up your UPYUN operator and password as environment variables:

```bash
export UPYUN_OPERATOR=<operator>
export UPYUN_PASSWORD=<password>
```

Refer to [UPYUN's documentation](https://docs.upyun.com/guide/) for details on obtaining these credentials.

## Usage

To upload a directory to a UPYUN bucket, use the following command:

```bash
upyun-uploader <bucket> <directory>
```

Replace `<bucket>` with your UPYUN bucket name and `<directory>` with the path to the directory you wish to upload.

## Integration with GitLab CI/CD

To integrate UPYUN Uploader with GitLab CI/CD, add the following configuration to your `.gitlab-ci.yml` file:

```yaml
deploy:
  stage: deploy
  image: node:20-slim
  script:
    - npm install -g upyun-uploader
    - upyun-uploader <bucket> <directory>
  only:
    - main
```

Replace the content in `<...>` with your own information.

If your main branch is not named `main`, you need to change it in the `only` section.

Remember to set `UPYUN_OPERATOR` and `UPYUN_PASSWORD` as environment variables in your GitLab project settings.

## License

[MIT](LICENSE).
