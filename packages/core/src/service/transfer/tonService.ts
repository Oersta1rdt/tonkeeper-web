import { Address, Cell, internal, loadStateInit } from '@ton/core';
import { Maybe } from '@ton/core/dist/utils/maybe';
import { mnemonicToPrivateKey } from '@ton/crypto';
import BigNumber from 'bignumber.js';
import { APIConfig } from '../../entries/apis';
import { AssetAmount } from '../../entries/crypto/asset/asset-amount';
import { TonRecipient, TonRecipientData, TransferEstimationEvent } from '../../entries/send';
import { TonConnectTransactionPayload } from '../../entries/tonConnect';
import { WalletState, WalletVersion } from '../../entries/wallet';
import { Account, AccountsApi, BlockchainApi, EmulationApi } from '../../tonApiV2';
import { walletContractFromState } from '../wallet/contractService';
import {
    checkMaxAllowedMessagesInMultiTransferOrDie,
    checkServiceTimeOrDie,
    checkWalletBalanceOrDie,
    checkWalletPositiveBalanceOrDie,
    externalMessage,
    getTTL,
    getWalletBalance,
    getWalletSeqNo,
    SendMode
} from './common';

export type AccountsMap = Map<string, Account>;

export type EstimateData = {
    accounts: AccountsMap;
    accountEvent: TransferEstimationEvent;
};

export const getAccountsMap = async (
    api: APIConfig,
    params: TonConnectTransactionPayload
): Promise<AccountsMap> => {
    const accounts = await Promise.all(
        params.messages.map(async message => {
            return [
                message.address,
                await new AccountsApi(api.tonApiV2).getAccount({ accountId: message.address })
            ] as const;
        })
    );
    return new Map<string, Account>(accounts);
};

/*
 * Raw address is bounceable by default,
 * Please make a note that in the TonWeb Raw address is non bounceable by default
 */
const seeIfAddressBounceable = (address: string) => {
    return Address.isFriendly(address) ? Address.parseFriendly(address).isBounceable : true;
};

/*
 * Allow to send non bounceable only if address is non bounceable and target contract is non active
 */
const seeIfBounceable = (accounts: AccountsMap, address: string) => {
    const bounceableAddress = seeIfAddressBounceable(address);
    const toAccount = accounts.get(address);
    const activeContract = toAccount && toAccount.status === 'active';

    return bounceableAddress || activeContract;
};

const toStateInit = (stateInit?: string): { code: Maybe<Cell>; data: Maybe<Cell> } | undefined => {
    if (!stateInit) {
        return undefined;
    }
    const { code, data } = loadStateInit(Cell.fromBase64(stateInit).asSlice());
    return {
        code,
        data
    };
};

const seeIfTransferBounceable = (account: Account, recipient: TonRecipient) => {
    if ('dns' in recipient) {
        return false;
    }
    if (!seeIfAddressBounceable(recipient.address)) {
        return false;
    }

    return account.status === 'active';
};

const createTonTransfer = (
    seqno: number,
    walletState: WalletState,
    recipient: TonRecipientData,
    weiAmount: BigNumber,
    isMax: boolean,
    secretKey: Buffer = Buffer.alloc(64)
) => {
    const contract = walletContractFromState(walletState);
    const transfer = contract.createTransfer({
        seqno,
        secretKey,
        timeout: getTTL(),
        sendMode: isMax
            ? SendMode.CARRY_ALL_REMAINING_BALANCE + SendMode.IGNORE_ERRORS
            : SendMode.PAY_GAS_SEPARATELY + SendMode.IGNORE_ERRORS,
        messages: [
            internal({
                to: recipient.toAccount.address,
                bounce: seeIfTransferBounceable(recipient.toAccount, recipient.address),
                value: BigInt(weiAmount.toFixed(0)),
                body: recipient.comment !== '' ? recipient.comment : undefined
            })
        ]
    });
    return externalMessage(contract, seqno, transfer).toBoc();
};

const createTonConnectTransfer = (
    seqno: number,
    walletState: WalletState,
    accounts: AccountsMap,
    params: TonConnectTransactionPayload,
    secretKey: Buffer = Buffer.alloc(64)
) => {
    const contract = walletContractFromState(walletState);

    const transfer = contract.createTransfer({
        seqno,
        secretKey,
        timeout: getTTL(),
        sendMode: SendMode.PAY_GAS_SEPARATELY + SendMode.IGNORE_ERRORS,
        messages: params.messages.map(item =>
            internal({
                to: item.address,
                bounce: seeIfBounceable(accounts, item.address),
                value: BigInt(item.amount),
                init: toStateInit(item.stateInit),
                body: item.payload ? Cell.fromBase64(item.payload) : undefined
            })
        )
    });
    return externalMessage(contract, seqno, transfer).toBoc({ idx: false });
};

export const estimateTonTransfer = async (
    api: APIConfig,
    walletState: WalletState,
    recipient: TonRecipientData,
    weiAmount: BigNumber,
    isMax: boolean
) => {
    await checkServiceTimeOrDie(api);
    const [wallet, seqno] = await getWalletBalance(api, walletState);
    if (!isMax) {
        checkWalletPositiveBalanceOrDie(wallet);
    }

    const cell = createTonTransfer(seqno, walletState, recipient, weiAmount, isMax);

    const event = await new EmulationApi(api.tonApiV2).emulateMessageToAccountEvent({
        ignoreSignatureCheck: true,
        accountId: wallet.address,
        decodeMessageRequest: { boc: cell.toString('base64') }
    });

    return { event };
};

export const estimateTonConnectTransfer = async (
    api: APIConfig,
    walletState: WalletState,
    accounts: AccountsMap,
    params: TonConnectTransactionPayload
): Promise<TransferEstimationEvent> => {
    await checkServiceTimeOrDie(api);
    const [wallet, seqno] = await getWalletBalance(api, walletState);
    checkWalletPositiveBalanceOrDie(wallet);

    const cell = createTonConnectTransfer(seqno, walletState, accounts, params);

    const event = await new EmulationApi(api.tonApiV2).emulateMessageToAccountEvent({
        ignoreSignatureCheck: true,
        accountId: wallet.address,
        decodeMessageRequest: { boc: cell.toString('base64') }
    });

    return { event };
};

export const sendTonConnectTransfer = async (
    api: APIConfig,
    walletState: WalletState,
    accounts: AccountsMap,
    params: TonConnectTransactionPayload,
    mnemonic: string[]
) => {
    await checkServiceTimeOrDie(api);
    const keyPair = await mnemonicToPrivateKey(mnemonic);
    const seqno = await getWalletSeqNo(api, walletState.active.rawAddress);

    const external = createTonConnectTransfer(
        seqno,
        walletState,
        accounts,
        params,
        keyPair.secretKey
    );

    const boc = external.toString('base64');

    await new BlockchainApi(api.tonApiV2).sendBlockchainMessage({
        sendBlockchainMessageRequest: { boc }
    });

    return boc;
};

export const sendTonTransfer = async (
    api: APIConfig,
    walletState: WalletState,
    recipient: TonRecipientData,
    amount: AssetAmount,
    isMax: boolean,
    fee: TransferEstimationEvent,
    mnemonic: string[]
) => {
    await checkServiceTimeOrDie(api);
    const keyPair = await mnemonicToPrivateKey(mnemonic);

    const total = new BigNumber(fee.event.extra).multipliedBy(-1).plus(amount.weiAmount);

    const [wallet, seqno] = await getWalletBalance(api, walletState);
    if (!isMax) {
        checkWalletBalanceOrDie(total, wallet);
    }

    const cell = createTonTransfer(
        seqno,
        walletState,
        recipient,
        amount.weiAmount,
        isMax,
        keyPair.secretKey
    );

    await new BlockchainApi(api.tonApiV2).sendBlockchainMessage({
        sendBlockchainMessageRequest: { boc: cell.toString('base64') }
    });
};

export type TransferMessage = {
    to: string;
    bounce: boolean;
    weiAmount: BigNumber;
    comment?: string;
};

export const transferMessagesToGroups = (
    transferMessages: TransferMessage[],
    walletVersion: WalletVersion
) => {
    const maxMessagesInTx = walletVersion === WalletVersion.W5 ? 255 : 4;

    return transferMessages.reduce((acc, transferMsg) => {
        const lastGroup = acc.length === 0 ? [] : acc[acc.length - 1];

        if (lastGroup.length === maxMessagesInTx) {
            acc.push([transferMsg]);
        } else {
            lastGroup.push(transferMsg);
            acc[acc.length - 1] = lastGroup;
        }
        return acc;
    }, [] as TransferMessage[][]);
};

const createTonMultiTransfer = (
    seqno: number,
    walletState: WalletState,
    transferMessages: TransferMessage[],
    secretKey: Buffer = Buffer.alloc(64)
) => {
    const contract = walletContractFromState(walletState);
    const groups = transferMessagesToGroups(transferMessages, walletState.active.version);

    return groups.map((group, index) => {
        const raw = {
            seqno: seqno + index,
            secretKey,
            timeout: getTTL() + 60 * index,
            sendMode: SendMode.PAY_GAS_SEPARATELY + SendMode.IGNORE_ERRORS,
            messages: group.map(msg =>
                internal({
                    to: msg.to,
                    bounce: msg.bounce,
                    value: BigInt(msg.weiAmount.toFixed(0)),
                    body: msg.comment !== '' ? msg.comment : undefined
                })
            )
        };
        const transfer = contract.createTransfer(raw);
        return { packed: externalMessage(contract, seqno, transfer).toBoc(), raw };
    });
};

export const MAX_ALLOWED_MULTI_TRANSFERS = {
    [WalletVersion.W5]: 510,
    [WalletVersion.V4R2]: 16,
    [WalletVersion.V4R1]: 16,
    [WalletVersion.V3R2]: 16,
    [WalletVersion.V3R1]: 16
};

export const estimateTonMultiTransfer = async (
    api: APIConfig,
    walletState: WalletState,
    transferMessages: TransferMessage[]
) => {
    await checkServiceTimeOrDie(api);

    const total = transferMessages.reduce((acc, msg) => acc.plus(msg.weiAmount), new BigNumber(0));
    const [wallet, seqno] = await getWalletBalance(api, walletState);
    checkWalletBalanceOrDie(total, wallet);

    checkMaxAllowedMessagesInMultiTransferOrDie(
        transferMessages.length,
        walletState.active.version
    );

    const cells = createTonMultiTransfer(seqno, walletState, transferMessages, Buffer.alloc(64));

    const emulationApi = new EmulationApi(api.tonApiV2);

    const estimations = cells.map(cell =>
        emulationApi.emulateMessageToAccountEvent({
            ignoreSignatureCheck: true,
            accountId: wallet.address,
            decodeMessageRequest: { boc: cell.packed.toString('base64') }
        })
    );

    return Promise.all(estimations);
};

export const sendTonMultiTransfer = async (
    api: APIConfig,
    walletState: WalletState,
    transferMessages: TransferMessage[],
    feeEstimate: BigNumber,
    mnemonic: string[]
) => {
    await checkServiceTimeOrDie(api);
    const keyPair = await mnemonicToPrivateKey(mnemonic);

    const total = transferMessages.reduce((acc, msg) => acc.plus(msg.weiAmount), new BigNumber(0));
    const [wallet, seqno] = await getWalletBalance(api, walletState);
    checkWalletBalanceOrDie(total.plus(feeEstimate), wallet);

    checkMaxAllowedMessagesInMultiTransferOrDie(
        transferMessages.length,
        walletState.active.version
    );

    const cells = createTonMultiTransfer(seqno, walletState, transferMessages, keyPair.secretKey);

    if (cells.length === 1) {
        await new BlockchainApi(api.tonApiV2).sendBlockchainMessage({
            sendBlockchainMessageRequest: { boc: cells[0].packed.toString('base64') }
        });
    } else {
        await new BlockchainApi(api.tonApiV2).sendBlockchainMessage({
            sendBlockchainMessageRequest: { batch: cells.map(c => c.packed.toString('base64')) }
        });
    }
    return cells;
};
