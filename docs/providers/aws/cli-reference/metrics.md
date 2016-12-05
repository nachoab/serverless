<!--
title: Serverless Framework Commands - AWS Lambda - Metrics
menuText: Metrics
menuOrder: 6
description: View metrics of your AWS Lambda Function within your terminal using the Serverless Framework
layout: Doc
-->

<!-- DOCS-SITE-LINK:START automatically generated  -->
### [Read this on the main serverless docs site](https://www.serverless.com/framework/docs/providers/aws/cli-reference/metrics)
<!-- DOCS-SITE-LINK:END -->

# Metrics

Lets you watch the metrics of a specific function.

```bash
serverless metrics --function hello
```

## Options

- `--function` or `-f` The function you want to fetch the metrics for. **Required**
- `--stage` or `-s` The stage you want to view the function metrics for. If not provided, the plugin will use the default stage listed in `serverless.yml`. If that doesn't exist either it'll just fetch the metrics from the `dev` stage.
- `--region` or `-r` The region you want to view the function metrics for. If not provided, the plugin will use the default region listed in `serverless.yml`. If that doesn't exist either it'll just fetch the metrics from the `us-east-1` region.
- `--startTime` A specific unit in time to start fetching metrics from (ie: `2010-10-20`, `1469705761`, `30m` (30 minutes ago), `2h` (2 days ago) or `3d` (3 days ago)). Date formats should be written in ISO 8601. Defaults to 24h ago.
- `--endTime` A specific unit in time to end fetching metrics from (ie: `2010-10-21` or `1469705761`). Date formats should be written in ISO 8601. Defaults to now.

## Examples

**Note:** There's a small lag between invoking the function and actually having access to the metrics. It takes a few seconds for the metrics to show up right after invoking the function.

### See all metrics of the last 24h

```bash
serverless metrics --function hello
```

Displays all metrics for the last 24h.

### See metrics for a specific timespan

```bash
serverless metrics --function hello --startTime 1970-01-01 --endTime 1970-01-02
```

Displays all metrics for the time between January 1, 1970 and January 2, 1970.
