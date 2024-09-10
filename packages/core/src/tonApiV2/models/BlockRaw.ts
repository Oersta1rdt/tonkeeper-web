/* tslint:disable */
/* eslint-disable */
/**
 * REST api to TON blockchain explorer
 * Provide access to indexed TON blockchain
 *
 * The version of the OpenAPI document: 2.0.0
 * Contact: support@tonkeeper.com
 *
 * NOTE: This class is auto generated by OpenAPI Generator (https://openapi-generator.tech).
 * https://openapi-generator.tech
 * Do not edit the class manually.
 */

import { mapValues } from '../runtime';
/**
 * 
 * @export
 * @interface BlockRaw
 */
export interface BlockRaw {
    /**
     * 
     * @type {number}
     * @memberof BlockRaw
     */
    workchain: number;
    /**
     * 
     * @type {string}
     * @memberof BlockRaw
     */
    shard: string;
    /**
     * 
     * @type {number}
     * @memberof BlockRaw
     */
    seqno: number;
    /**
     * 
     * @type {string}
     * @memberof BlockRaw
     */
    rootHash: string;
    /**
     * 
     * @type {string}
     * @memberof BlockRaw
     */
    fileHash: string;
}

/**
 * Check if a given object implements the BlockRaw interface.
 */
export function instanceOfBlockRaw(value: object): value is BlockRaw {
    if (!('workchain' in value) || value['workchain'] === undefined) return false;
    if (!('shard' in value) || value['shard'] === undefined) return false;
    if (!('seqno' in value) || value['seqno'] === undefined) return false;
    if (!('rootHash' in value) || value['rootHash'] === undefined) return false;
    if (!('fileHash' in value) || value['fileHash'] === undefined) return false;
    return true;
}

export function BlockRawFromJSON(json: any): BlockRaw {
    return BlockRawFromJSONTyped(json, false);
}

export function BlockRawFromJSONTyped(json: any, ignoreDiscriminator: boolean): BlockRaw {
    if (json == null) {
        return json;
    }
    return {
        
        'workchain': json['workchain'],
        'shard': json['shard'],
        'seqno': json['seqno'],
        'rootHash': json['root_hash'],
        'fileHash': json['file_hash'],
    };
}

  export function BlockRawToJSON(json: any): BlockRaw {
      return BlockRawToJSONTyped(json, false);
  }

  export function BlockRawToJSONTyped(value?: BlockRaw | null, ignoreDiscriminator: boolean = false): any {
    if (value == null) {
        return value;
    }

    return {
        
        'workchain': value['workchain'],
        'shard': value['shard'],
        'seqno': value['seqno'],
        'root_hash': value['rootHash'],
        'file_hash': value['fileHash'],
    };
}

