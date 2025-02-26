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

import { HttpSetup } from 'src/core/public';
import { IndexPatternMissingIndices } from '../../../common/index_patterns/lib';
import { GetFieldsOptions, IIndexPatternsApiClient } from '../../../common/index_patterns/types';

const API_BASE_URL: string = `/api/index_patterns/`;

export class IndexPatternsApiClient implements IIndexPatternsApiClient {
  private http: HttpSetup;

  constructor(http: HttpSetup) {
    this.http = http;
  }

  private _request(url: string, query: any) {
    return this.http
      .fetch(url, {
        query,
      })
      .catch((resp: any) => {
        if (resp.body.statusCode === 404 && resp.body.attributes?.code === 'no_matching_indices') {
          throw new IndexPatternMissingIndices(resp.body.message);
        }

        throw new Error(resp.body.message || resp.body.error || `${resp.body.statusCode} Response`);
      });
  }

  private _getUrl(path: string[]) {
    return API_BASE_URL + path.filter(Boolean).map(encodeURIComponent).join('/');
  }

  getFieldsForTimePattern(options: GetFieldsOptions = {}) {
    const { pattern, lookBack, metaFields } = options;

    const url = this._getUrl(['_fields_for_time_pattern']);

    return this._request(url, {
      pattern,
      look_back: lookBack,
      meta_fields: metaFields,
    }).then((resp: any) => resp.fields);
  }

  getFieldsForWildcard(options: GetFieldsOptions = {}) {
    const { pattern, metaFields, type, params } = options;

    let url;
    let query;

    if (type) {
      url = this._getUrl([type, '_fields_for_wildcard']);
      query = {
        pattern,
        meta_fields: metaFields,
        params: JSON.stringify(params),
      };
    } else {
      url = this._getUrl(['_fields_for_wildcard']);
      query = {
        pattern,
        meta_fields: metaFields,
      };
    }

    return this._request(url, query).then((resp: any) => resp.fields);
  }
}
