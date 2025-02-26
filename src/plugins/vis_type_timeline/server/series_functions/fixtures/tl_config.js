/*
 * SPDX-License-Identifier: Apache-2.0
 *
 * The OpenSearch Contributors require contributions made to
 * this file be licensed under the Apache-2.0 license or a
 * compatible open source license.
 *
 * Any modifications Copyright OpenSearch Contributors. See
 * GitHub history for details.
 */

/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import moment from 'moment';
import sinon from 'sinon';
import timelineDefaults from '../../lib/get_namespaced_settings';
import opensearchResponse from './opensearch_response';

export default function () {
  const functions = require('../../lib/load_functions')('series_functions');

  const tlConfig = require('../../handlers/lib/tl_config.js')({
    getFunction: (name) => {
      if (!functions[name]) throw new Error('No such function: ' + name);
      return functions[name];
    },
    getStartServices: sinon.stub().returns(
      Promise.resolve([
        {},
        {
          data: {
            search: { search: () => Promise.resolve({ rawResponse: opensearchResponse }) },
          },
        },
      ])
    ),

    opensearchShardTimeout: moment.duration(30000),
    allowedGraphiteUrls: ['https://www.hostedgraphite.com/UID/ACCESS_KEY/graphite'],
    blockedGraphiteIPs: [],
  });

  tlConfig.time = {
    interval: '1y',
    from: moment('1980-01-01T00:00:00Z').valueOf(),
    to: moment('1983-01-01T00:00:00Z').valueOf(),
    timezone: 'Etc/UTC',
  };

  tlConfig.settings = timelineDefaults();

  tlConfig.allowedGraphiteUrls = timelineDefaults();

  tlConfig.blockedGraphiteIPs = timelineDefaults();

  tlConfig.setTargetSeries();

  return tlConfig;
}
