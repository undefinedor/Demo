#!/usr/bin/env node
import * as cdk from '@aws-cdk/core';
import { InterviewStack } from '../lib/interview-stack';

const app = new cdk.App();
new InterviewStack(app, 'InterviewStack');
