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
import type { AccountAddress } from './AccountAddress';
import {
    AccountAddressFromJSON,
    AccountAddressFromJSONTyped,
    AccountAddressToJSON,
    AccountAddressToJSONTyped,
} from './AccountAddress';

/**
 * 
 * @export
 * @interface JettonHoldersAddressesInner
 */
export interface JettonHoldersAddressesInner {
    /**
     * 
     * @type {string}
     * @memberof JettonHoldersAddressesInner
     */
    address: string;
    /**
     * 
     * @type {AccountAddress}
     * @memberof JettonHoldersAddressesInner
     */
    owner: AccountAddress;
    /**
     * balance in the smallest jetton's units
     * @type {string}
     * @memberof JettonHoldersAddressesInner
     */
    balance: string;
}

/**
 * Check if a given object implements the JettonHoldersAddressesInner interface.
 */
export function instanceOfJettonHoldersAddressesInner(value: object): value is JettonHoldersAddressesInner {
    if (!('address' in value) || value['address'] === undefined) return false;
    if (!('owner' in value) || value['owner'] === undefined) return false;
    if (!('balance' in value) || value['balance'] === undefined) return false;
    return true;
}

export function JettonHoldersAddressesInnerFromJSON(json: any): JettonHoldersAddressesInner {
    return JettonHoldersAddressesInnerFromJSONTyped(json, false);
}

export function JettonHoldersAddressesInnerFromJSONTyped(json: any, ignoreDiscriminator: boolean): JettonHoldersAddressesInner {
    if (json == null) {
        return json;
    }
    return {
        
        'address': json['address'],
        'owner': AccountAddressFromJSON(json['owner']),
        'balance': json['balance'],
    };
}

  export function JettonHoldersAddressesInnerToJSON(json: any): JettonHoldersAddressesInner {
      return JettonHoldersAddressesInnerToJSONTyped(json, false);
  }

  export function JettonHoldersAddressesInnerToJSONTyped(value?: JettonHoldersAddressesInner | null, ignoreDiscriminator: boolean = false): any {
    if (value == null) {
        return value;
    }

    return {
        
        'address': value['address'],
        'owner': AccountAddressToJSON(value['owner']),
        'balance': value['balance'],
    };
}

