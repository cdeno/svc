![Sequence diagram](./diagram.svg)

## Install serverless
You need to have [serverless](https://serverless.com/) installed and your [AWS Credentials](https://serverless.com/framework/docs/providers/aws/guide/credentials#creating-aws-access-keys) in place.

Serverless requires [an IAM user](https://serverless.com/framework/docs/providers/aws/guide/credentials/) that is used to build the stack.
You can use [their recommended policy](https://gist.github.com/ServerlessBot/7618156b8671840a539f405dea2704c8) or [this one](./serverless-agent-policy.json).

## Deploy stack

The stack consists of 1 sqs queue, 1 dynamodb, 7 lambdas, 1 s3 bucket & an API Gateway with 6 routes

`serverless deploy`

or with options (default values shown)

`serverless deploy --stage dev --bucket cdeno --region eu-west-2`

AWS Bucket names are unique so choose something that's unlikely to clash.

The stage is suffixed to the bucket name i.e. `cdeno-dev`

## Test stack

If the deployment worked serverless should report the API gateway endpoints.
To test the stack works, try POSTing to the `/register` endpoint using the following body:

```json
{
  "url": "https://github.com/denoland/deno_std/releases/tag/v0.8.0",
  "description": "deno standard modules"
}
```

Wait a few seconds and then check your resources.
The s3 bucket should have a copy of the source code and the dynamo tables a registry entry for the module & version.

## Remove the stack

`serverless remove`

## Should I use this?

Probably not, no. It was a learning exercise to understand more about how serverless works with AWS Services. It needs lots more rigor to be useful. I was interested in building a registry of sorts for [deno](https://deno.land/) and things went from there.

If you are interested in using s3 as a backup store for your code files or CDN then I'd recommend this [AWS Quick start guide](https://github.com/aws-quickstart/quickstart-git2s3). It fairly easy to set up and supports other SCP like `bitbucket` and `tfs`. It doesn't have a notion of a registry though, it's just a secure and robust way to get files from a git repo to s3.


If you do go ahead and install the `cdeno` stack, please know the following:

- There's **no security around the endpoints**, significantly the two POST endpoints. Basically, anyone with a link can put files into your bucket.
- There's no security around the `/webhook` endpoint, nor is there any [validation that it's really github](https://github.com/cdeno/quickstart-git2s3/blob/master/functions/source/GitPullS3/lambda_function.py#L141) making the call.
- No [credentials are used](https://github.com/cdeno/quickstart-git2s3/blob/master/functions/source/GitPullS3/lambda_function.py#L207) when pulling the git repo
- The bucket is public read

## Known issues
- The AWS CLI `aws s3 sync` command is used to sync the extract release.zip to s3. It has mime-type guessing built in but it's not great. At the moment, [it's disabled](./download-sync.js#L12) and content-type 'text/plain' is used.

## Fun
- AWS Lambdas don't have the `aws cli` pre-installed. Getting this to work for someone like me who doesn't know much python was a war of attrition but lots of fun. It involves building a `virtualenv` and following quite a few steps. It took me ages to get it right - if you have a need to run the `aws cli` on lambda, it's now easily packaged as [a zip](./layers/awscli.zip) in this project. You can use it as a lambda layer in serverless [like this](./serverless.yml#L116)

Thanks to 
- https://bezdelev.com/hacking/aws-cli-inside-lambda-layer-aws-s3-sync/
- https://alestic.com/2016/11/aws-lambda-awscli/
- https://stackoverflow.com/questions/33513604/call-aws-cli-from-aws-lambda


MIT Licence
