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

import { Client } from 'elasticsearch';
import sinon from 'sinon';
import { ToolingLog } from '@osd/dev-utils';
import { Stats } from '../../stats';

type StubStats = Stats & {
  getTestSummary: () => Record<string, number>;
};

export const createStubStats = (): StubStats =>
  ({
    createdIndex: sinon.stub(),
    createdAliases: sinon.stub(),
    deletedIndex: sinon.stub(),
    skippedIndex: sinon.stub(),
    archivedIndex: sinon.stub(),
    getTestSummary() {
      const summary: Record<string, number> = {};
      Object.keys(this).forEach((key) => {
        if (this[key].callCount) {
          summary[key] = this[key].callCount;
        }
      });
      return summary;
    },
  } as any);

export const createStubLogger = (): ToolingLog =>
  ({
    debug: sinon.stub(),
    info: sinon.stub(),
    success: sinon.stub(),
    warning: sinon.stub(),
    error: sinon.stub(),
  } as any);

export const createStubIndexRecord = (index: string, aliases = {}) => ({
  type: 'index',
  value: { index, aliases },
});

export const createStubDocRecord = (index: string, id: number) => ({
  type: 'doc',
  value: { index, id },
});

const createOpenSearchClientError = (errorType: string) => {
  const err = new Error(`OpenSearch Client Error Stub "${errorType}"`);
  (err as any).body = {
    error: {
      type: errorType,
    },
  };
  return err;
};

const indexAlias = (aliases: Record<string, any>, index: string) =>
  Object.keys(aliases).find((k) => aliases[k] === index);

type StubClient = Client;

export const createStubClient = (
  existingIndices: string[] = [],
  aliases: Record<string, any> = {}
): StubClient =>
  ({
    indices: {
      get: sinon.spy(async ({ index }) => {
        if (!existingIndices.includes(index)) {
          throw createOpenSearchClientError('index_not_found_exception');
        }

        return {
          [index]: {
            mappings: {},
            settings: {},
          },
        };
      }),
      existsAlias: sinon.spy(({ name }) => {
        return Promise.resolve(aliases.hasOwnProperty(name));
      }),
      getAlias: sinon.spy(async ({ index, name }) => {
        if (index && existingIndices.indexOf(index) >= 0) {
          const result = indexAlias(aliases, index);
          return { [index]: { aliases: result ? { [result]: {} } : {} } };
        }

        if (name && aliases[name]) {
          return { [aliases[name]]: { aliases: { [name]: {} } } };
        }

        return { status: 404 };
      }),
      updateAliases: sinon.spy(async ({ body }) => {
        body.actions.forEach(
          ({ add: { index, alias } }: { add: { index: string; alias: string } }) => {
            if (!existingIndices.includes(index)) {
              throw createOpenSearchClientError('index_not_found_exception');
            }
            existingIndices.push({ index, alias } as any);
          }
        );

        return { ok: true };
      }),
      create: sinon.spy(async ({ index }) => {
        if (existingIndices.includes(index) || aliases.hasOwnProperty(index)) {
          throw createOpenSearchClientError('resource_already_exists_exception');
        } else {
          existingIndices.push(index);
          return { ok: true };
        }
      }),
      delete: sinon.spy(async ({ index }) => {
        const indices = Array.isArray(index) ? index : [index];
        if (indices.every((ix) => existingIndices.includes(ix))) {
          // Delete aliases associated with our indices
          indices.forEach((ix) => {
            const alias = Object.keys(aliases).find((k) => aliases[k] === ix);
            if (alias) {
              delete aliases[alias];
            }
          });
          indices.forEach((ix) => existingIndices.splice(existingIndices.indexOf(ix), 1));
          return { ok: true };
        } else {
          throw createOpenSearchClientError('index_not_found_exception');
        }
      }),
      exists: sinon.spy(async () => {
        throw new Error('Do not use indices.exists(). React to errors instead.');
      }),
    },
  } as any);
