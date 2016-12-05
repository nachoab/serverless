'use strict';

const expect = require('chai').expect;
const sinon = require('sinon');
const BbPromise = require('bluebird');
const AwsProvider = require('../provider/awsProvider');
const AwsMetrics = require('./awsMetrics');
const Serverless = require('../../../Serverless');
const CLI = require('../../../classes/CLI');
const chalk = require('chalk');

describe('AwsMetrics', () => {
  let awsMetrics;
  let serverless;

  beforeEach(() => {
    serverless = new Serverless();
    serverless.cli = new CLI(serverless);
    serverless.setProvider('aws', new AwsProvider(serverless));
    const options = {
      stage: 'dev',
      region: 'us-east-1',
    };
    awsMetrics = new AwsMetrics(serverless, options);
  });

  describe('#constructor()', () => {
    it('should set the serverless instance to this.serverless', () => {
      expect(awsMetrics.serverless).to.deep.equal(serverless);
    });

    it('should set the passed in options to this.options', () => {
      expect(awsMetrics.options).to.deep.equal({ stage: 'dev', region: 'us-east-1' });
    });

    it('should set the provider variable to the AwsProvider instance', () =>
      expect(awsMetrics.provider).to.be.instanceof(AwsProvider));

    it('should have a "metrics:metrics" hook', () => {
      // eslint-disable-next-line no-unused-expressions
      expect(awsMetrics.hooks['metrics:metrics']).to.not.be.undefined;
    });

    it('should run promise chain in order for "metrics:metrics" hook', () => {
      const extendedValidateStub = sinon
        .stub(awsMetrics, 'extendedValidate').returns(BbPromise.resolve());
      const getMetricsStub = sinon
        .stub(awsMetrics, 'getMetrics').returns(BbPromise.resolve());
      const showMetricsStub = sinon
        .stub(awsMetrics, 'showMetrics').returns(BbPromise.resolve());

      return awsMetrics.hooks['metrics:metrics']().then(() => {
        expect(extendedValidateStub.calledOnce).to.equal(true);
        expect(getMetricsStub.calledAfter(extendedValidateStub)).to.equal(true);
        expect(showMetricsStub.calledAfter(getMetricsStub)).to.equal(true);

        awsMetrics.extendedValidate.restore();
        awsMetrics.getMetrics.restore();
        awsMetrics.showMetrics.restore();
      });
    });
  });

  describe('#extendedValidate()', () => {
    let validateStub;

    beforeEach(() => {
      awsMetrics.serverless.service.functions = {
        function1: {},
      };
      awsMetrics.serverless.service.service = 'my-service';
      awsMetrics.options.function = 'function1';
      validateStub = sinon
        .stub(awsMetrics, 'validate').returns(BbPromise.resolve);
    });

    afterEach(() => {
      awsMetrics.validate.restore();
    });

    it('should call the shared validate() function', () =>
      awsMetrics.extendedValidate().then(() => {
        expect(validateStub.calledOnce).to.equal(true);
      })
    );

    it('should set the startTime to yesterday as the default value if not provided', () => {
      awsMetrics.options.startTime = null;

      let yesterday = new Date();
      yesterday = yesterday.setDate(yesterday.getDate() - 1);
      yesterday = new Date(yesterday);
      const yesterdaysYear = yesterday.getFullYear();
      const yesterdaysMonth = yesterday.getMonth() + 1;
      const yesterdaysDay = yesterday.getDate();
      const yesterdaysDate = `${yesterdaysYear}-${yesterdaysMonth}-${yesterdaysDay}`;

      return awsMetrics.extendedValidate().then(() => {
        const defaultsStartTime = awsMetrics.options.startTime;
        const defaultsYear = defaultsStartTime.getFullYear();
        const defaultsMonth = defaultsStartTime.getMonth() + 1;
        const defaultsDay = defaultsStartTime.getDate();
        const defaultsDate = `${defaultsYear}-${defaultsMonth}-${defaultsDay}`;

        expect(defaultsDate).to.equal(yesterdaysDate);
      });
    });

    it('should set the startTime to the provided value', () => {
      awsMetrics.options.startTime = '1970-01-01';

      return awsMetrics.extendedValidate().then(() => {
        const startTime = awsMetrics.options.startTime.toISOString();
        const expectedStartTime = new Date('1970-01-01').toISOString();

        expect(startTime).to.equal(expectedStartTime);
      });
    });

    it('should translate human friendly syntax (e.g. 24h) for startTime', () => {
      awsMetrics.options.startTime = '24h'; // 24 hours ago

      let yesterday = new Date();
      yesterday = yesterday.setDate(yesterday.getDate() - 1);
      yesterday = new Date(yesterday);
      const yesterdaysYear = yesterday.getFullYear();
      const yesterdaysMonth = yesterday.getMonth() + 1;
      const yesterdaysDay = yesterday.getDate();
      const yesterdaysDate = `${yesterdaysYear}-${yesterdaysMonth}-${yesterdaysDay}`;

      return awsMetrics.extendedValidate().then(() => {
        const translatedStartTime = awsMetrics.options.startTime;
        const translatedYear = translatedStartTime.getFullYear();
        const translatedMonth = translatedStartTime.getMonth() + 1;
        const translatedDay = translatedStartTime.getDate();
        const translatedDate = `${translatedYear}-${translatedMonth}-${translatedDay}`;

        expect(translatedDate).to.equal(yesterdaysDate);
      });
    });

    it('should set the endTime to today as the default value if not provided', () => {
      awsMetrics.options.endTime = null;

      const today = new Date();
      const todaysYear = today.getFullYear();
      const todaysMonth = today.getMonth() + 1;
      const todaysDay = today.getDate();
      const todaysDate = `${todaysYear}-${todaysMonth}-${todaysDay}`;

      return awsMetrics.extendedValidate().then(() => {
        const defaultsStartTime = awsMetrics.options.endTime;
        const defaultsYear = defaultsStartTime.getFullYear();
        const defaultsMonth = defaultsStartTime.getMonth() + 1;
        const defaultsDay = defaultsStartTime.getDate();
        const defaultsDate = `${defaultsYear}-${defaultsMonth}-${defaultsDay}`;

        expect(defaultsDate).to.equal(todaysDate);
      });
    });

    it('should set the endTime to the provided value', () => {
      awsMetrics.options.endTime = '1970-01-01';

      return awsMetrics.extendedValidate().then(() => {
        const endTime = awsMetrics.options.endTime.toISOString();
        const expectedEndTime = new Date('1970-01-01').toISOString();

        expect(endTime).to.equal(expectedEndTime);
      });
    });
  });

  describe('#getMetrics()', () => {
    let requestStub;

    beforeEach(() => {
      awsMetrics.options.function = 'function1';
      awsMetrics.options.startTime = '1970-01-01';
      awsMetrics.options.endTime = '1970-01-02';
      requestStub = sinon.stub(awsMetrics.provider, 'request');
    });

    afterEach(() => {
      awsMetrics.provider.request.restore();
    });

    it('should should gather metrics for the function', () => {
      // invocations
      requestStub.onCall(0).returns(
        BbPromise.resolve({
          ResponseMetadata: { RequestId: '1f50045b-b569-11e6-86c6-eb54d1aaa755' },
          Label: 'Invocations',
          Datapoints: [],
        })
      );
      // throttles
      requestStub.onCall(1).returns(
        BbPromise.resolve({
          ResponseMetadata: { RequestId: '1f59059b-b569-11e6-aa18-c7bab68810d2' },
          Label: 'Throttles',
          Datapoints: [],
        })
      );
      // errors
      requestStub.onCall(2).returns(
        BbPromise.resolve({
          ResponseMetadata: { RequestId: '1f50c7b1-b569-11e6-b1b6-ab86694b617b' },
          Label: 'Errors',
          Datapoints: [],
        })
      );
      // duration
      requestStub.onCall(3).returns(
        BbPromise.resolve({
          ResponseMetadata: { RequestId: '1f63db14-b569-11e6-8501-d98a275ce164' },
          Label: 'Duration',
          Datapoints: [],
        })
      );

      const expectedResult = [
        { ResponseMetadata: { RequestId: '1f50045b-b569-11e6-86c6-eb54d1aaa755' },
          Label: 'Invocations',
          Datapoints: [],
        },
        { ResponseMetadata: { RequestId: '1f59059b-b569-11e6-aa18-c7bab68810d2' },
          Label: 'Throttles',
          Datapoints: [],
        },
        { ResponseMetadata: { RequestId: '1f50c7b1-b569-11e6-b1b6-ab86694b617b' },
          Label: 'Errors',
          Datapoints: [],
        },
        { ResponseMetadata: { RequestId: '1f63db14-b569-11e6-8501-d98a275ce164' },
          Label: 'Duration',
          Datapoints: [],
        },
      ];

      return awsMetrics.getMetrics().then((result) => {
        expect(result).to.deep.equal(expectedResult);
      });
    });
  });

  describe('#showMetrics()', () => {
    let consoleLogStub;

    beforeEach(() => {
      awsMetrics.options.function = 'function1';
      awsMetrics.options.startTime = '1970-01-01';
      awsMetrics.options.endTime = '1970-01-02';
      consoleLogStub = sinon.stub(serverless.cli, 'consoleLog').returns();
    });

    afterEach(() => {
      serverless.cli.consoleLog.restore();
    });

    it('should display all metrics for the given function', () => {
      const metrics = [
        {
          ResponseMetadata: {
            RequestId: '1f50045b-b569-11e6-86c6-eb54d1aaa755',
          },
          Label: 'Invocations',
          Datapoints: [{ Sum: 12 }, { Sum: 8 }],
        },
        {
          ResponseMetadata: {
            RequestId: '1f59059b-b569-11e6-aa18-c7bab68810d2',
          },
          Label: 'Throttles',
          Datapoints: [{ Sum: 15 }, { Sum: 15 }],
        },
        {
          ResponseMetadata: {
            RequestId: '1f50c7b1-b569-11e6-b1b6-ab86694b617b',
          },
          Label: 'Errors',
          Datapoints: [{ Sum: 0 }],
        },
        {
          ResponseMetadata: {
            RequestId: '1f63db14-b569-11e6-8501-d98a275ce164',
          },
          Label: 'Duration',
          Datapoints: [{ Average: 1000 }],
        },
      ];

      let expectedMessage = '';
      expectedMessage += `${chalk.yellow.underline(awsMetrics.options.function)}\n`;
      expectedMessage += 'January 1, 1970 12:00 AM - January 2, 1970 12:00 AM\n\n';
      expectedMessage += `${chalk.yellow('Invocations: 20 \n')}`;
      expectedMessage += `${chalk.yellow('Throttles: 30 \n')}`;
      expectedMessage += `${chalk.yellow('Errors: 0 \n')}`;
      expectedMessage += `${chalk.yellow('Duration (avg.): 1000ms')}`;

      return awsMetrics.showMetrics(metrics).then((message) => {
        expect(consoleLogStub.calledOnce).to.equal(true);
        expect(message).to.equal(expectedMessage);
      });
    });

    it('should resolve with an error message if no metrics are available', () => {
      let expectedMessage = '';
      expectedMessage += `${chalk.yellow.underline(awsMetrics.options.function)}\n`;
      expectedMessage += 'January 1, 1970 12:00 AM - January 2, 1970 12:00 AM\n\n';
      expectedMessage += `${chalk.yellow('There are no metrics to show for these options')}`;

      return awsMetrics.showMetrics().then((message) => {
        expect(consoleLogStub.calledOnce).to.equal(true);
        expect(message).to.equal(expectedMessage);
      });
    });
  });
});
