import { FC, forwardRef, Fragment } from 'react';
import {
    DragDropContext,
    Draggable,
    DraggableProvidedDragHandleProps,
    Droppable
} from 'react-beautiful-dnd';
import styled, { css } from 'styled-components';
import { DropDownContent, DropDownItem } from '../../components/DropDown';
import { EllipsisIcon, FolderIcon, PlusIcon, ReorderIcon } from '../../components/Icon';
import { ListBlockDesktopAdaptive, ListItem } from '../../components/List';
import { Body2Class, Label2, TextEllipsis } from '../../components/Text';
import { WalletEmoji } from '../../components/shared/emoji/WalletEmoji';
import { useTranslation } from '../../hooks/translation';
import { useAccountsState, useAccountsDNDDrop, useActiveTonNetwork, useSideBarItems } from "../../state/wallet";
import {
    Account,
    AccountKeystone,
    AccountLedger,
    AccountMAM,
    AccountTonMnemonic,
    AccountTonMultisig,
    AccountTonOnly,
    AccountTonWatchOnly
} from '@tonkeeper/core/dist/entries/account';
import { useAddWalletNotification } from '../../components/modals/AddWalletNotificationControlled';
import {
    DesktopViewHeader,
    DesktopViewPageLayout
} from '../../components/desktop/DesktopViewLayout';
import {
    AccountBadge,
    WalletIndexBadge,
    WalletVersionBadge
} from '../../components/account/AccountBadge';
import { AccountsFolder } from '../../state/global-preferences';
import {
    sortDerivationsByIndex,
    sortWalletsByVersion,
    WalletId
} from '@tonkeeper/core/dist/entries/wallet';
import { formatAddress, toShortValue } from '@tonkeeper/core/dist/utils/common';
import { assertUnreachable } from '@tonkeeper/core/dist/utils/types';
import { useMultisigsOfAccountToDisplay } from '../../state/multisig';
import { SelectDropDown } from '../../components/fields/Select';
import { useRenameNotification } from '../../components/modals/RenameNotificationControlled';
import { useDeleteAccountNotification } from '../../components/modals/DeleteAccountNotificationControlled';
import { useRecoveryNotification } from '../../components/modals/RecoveryNotificationControlled';
import { Button } from '../../components/fields/Button';
import { useManageFolderNotification } from '../../components/modals/ManageFolderNotificationControlled';
import { useDeleteFolder } from '../../state/folders';
import { useIsScrolled } from '../../hooks/useIsScrolled';

const DesktopViewPageLayoutStyled = styled(DesktopViewPageLayout)`
    height: 100%;
`;

const Row = styled.div<{ $tabLevel?: number }>`
    height: 40px;
    box-sizing: border-box;
    display: flex;
    gap: 0.5rem;
    align-items: center;
    ${p => `padding-left: ${16 + (p.$tabLevel ?? 0) * 28}px !important;`}
    border-bottom: none !important;

    width: 100%;
`;

const Icon = styled.span`
    display: flex;
    color: ${props => props.theme.iconSecondary};
`;

const DragHandleMock = styled.div`
    width: 28px;
    height: 28px;
`;

const DropDownStyled = styled(SelectDropDown)`
    margin-left: auto;
    width: fit-content;
`;

const ListItemStyled = styled(ListItem)<{ $isDragging: boolean }>`
    flex-direction: column;
    ${p =>
        p.$isDragging &&
        css`
            border-radius: unset !important;
            background-color: ${p.theme.backgroundContent};
            > div {
                border: none !important;
            }
        `}

    &:last-child {
        border-bottom: 1px solid ${p => p.theme.separatorCommon};
    }
`;

const BottomButtonContainer = styled.div`
    padding: 1rem;
`;

const NewFolderButton = styled.button`
    border: none;
    background-color: transparent;
    padding: 0.5rem 1rem;
    display: flex;
    align-items: center;
    justify-content: center;

    color: ${p => p.theme.textAccent};
    margin-left: auto;
    ${Body2Class};
`;

export const DesktopManageAccountsPage = () => {
    const { ref: scrollRef, closeTop } = useIsScrolled();
    const { onOpen: addWallet } = useAddWalletNotification();
    const { onOpen: manageFolders } = useManageFolderNotification();
    const { t } = useTranslation();

    const handleDrop = useAccountsDNDDrop();

    const items = useSideBarItems();

    return (
        <DesktopViewPageLayoutStyled ref={scrollRef}>
            <DesktopViewHeader borderBottom={!closeTop}>
                <Label2>{t('Manage_wallets')}</Label2>
                <NewFolderButton onClick={() => manageFolders()}>
                    {t('accounts_new_folder')}
                </NewFolderButton>
            </DesktopViewHeader>
            <DragDropContext onDragEnd={handleDrop}>
                <Droppable droppableId="wallets">
                    {provided => (
                        <ListBlockDesktopAdaptive
                            {...provided.droppableProps}
                            ref={provided.innerRef}
                            margin={false}
                        >
                            {items.map((item, index) => (
                                <Draggable key={item.id} draggableId={item.id} index={index}>
                                    {(p, snapshot) => {
                                        const transform = p.draggableProps.style?.transform;
                                        if (transform) {
                                            try {
                                                const tr = transform.split(',')[1];
                                                p.draggableProps.style!.transform =
                                                    'translate(0px,' + tr;
                                            } catch (_) {
                                                //
                                            }
                                        }

                                        return (
                                            <ListItemStyled
                                                hover={false}
                                                ref={p.innerRef}
                                                {...p.draggableProps}
                                                $isDragging={snapshot.isDragging}
                                            >
                                                <ItemRow
                                                    dragHandleProps={p.dragHandleProps}
                                                    item={item}
                                                />
                                            </ListItemStyled>
                                        );
                                    }}
                                </Draggable>
                            ))}
                            {provided.placeholder}
                        </ListBlockDesktopAdaptive>
                    )}
                </Droppable>
            </DragDropContext>

            <BottomButtonContainer>
                <Button secondary fullWidth onClick={() => addWallet()}>
                    <PlusIcon />
                    {t('add_wallet')}
                </Button>
            </BottomButtonContainer>
        </DesktopViewPageLayoutStyled>
    );
};

const Label2Styled = styled(Label2)`
    ${TextEllipsis}
`;

const useAccountOptions = () => {
    const { onOpen: onRename } = useRenameNotification();
    const { onOpen: onDelete } = useDeleteAccountNotification();
    const { onOpen: onRecovery } = useRecoveryNotification();

    return {
        onRename,
        onDelete,
        onRecovery
    };
};

const AccountBadgeStyled = styled(AccountBadge)`
    margin-left: -4px;
`;

const WalletVersionBadgeStyled = styled(WalletVersionBadge)`
    margin-left: -4px;
`;

const WalletIndexBadgeStyled = styled(WalletIndexBadge)`
    margin-left: -4px;
`;

const DropDownItemStyled = styled(DropDownItem)`
    &:not(:last-child) {
        border-bottom: 1px solid ${p => p.theme.separatorCommon};
    }
`;

const AccountMenu: FC<{ options: { name: string; onClick: () => void }[] }> = ({ options }) => {
    return (
        <DropDownStyled
            right="1rem"
            top="0.5rem"
            payload={onClose => (
                <DropDownContent>
                    {options.map(option => (
                        <DropDownItemStyled
                            onClick={() => {
                                onClose();
                                option.onClick();
                            }}
                            isSelected={false}
                            key={option.name}
                        >
                            <Label2>{option.name}</Label2>
                        </DropDownItemStyled>
                    ))}
                </DropDownContent>
            )}
        >
            <Icon>
                <EllipsisIcon />
            </Icon>
        </DropDownStyled>
    );
};

const MultisigsGroupRows: FC<{
    hostWalletId: WalletId;
    tabLevel: number;
}> = ({ hostWalletId, tabLevel }) => {
    const multisigsToDisplay = useMultisigsOfAccountToDisplay(hostWalletId);
    return (
        <>
            {multisigsToDisplay.map(val => (
                <MultisigItemRow key={val.account.id} account={val.account} tabLevel={tabLevel} />
            ))}
        </>
    );
};

const MultisigItemRow = forwardRef<
    HTMLDivElement,
    {
        account: AccountTonMultisig;
        tabLevel: number;
    }
>(({ account, tabLevel }, ref) => {
    const { onRename } = useAccountOptions();
    const { t } = useTranslation();
    return (
        <Row ref={ref} $tabLevel={tabLevel}>
            <DragHandleMock />
            <WalletEmoji emojiSize="16px" containerSize="16px" emoji={account.emoji} />
            <Label2Styled>{account.name}</Label2Styled>
            <AccountBadgeStyled accountType={account.type} size="s" />
            <AccountMenu
                options={[
                    { name: t('Rename'), onClick: () => onRename({ accountId: account.id }) }
                ]}
            />
        </Row>
    );
});

const AccountMnemonicRow: FC<{
    account: AccountTonMnemonic;
    dragHandleProps: DraggableProvidedDragHandleProps | null | undefined;
    tabLevel: number;
}> = ({ account, dragHandleProps, tabLevel }) => {
    const network = useActiveTonNetwork();
    const { t } = useTranslation();
    const { onRename, onDelete, onRecovery } = useAccountOptions();

    const sortedWallets = account.tonWallets.slice().sort(sortWalletsByVersion);

    return (
        <>
            <Row $tabLevel={tabLevel}>
                <Icon {...dragHandleProps}>
                    <ReorderIcon />
                </Icon>
                <WalletEmoji emojiSize="16px" containerSize="16px" emoji={account.emoji} />
                <Label2Styled>{account.name}</Label2Styled>
                <AccountMenu
                    options={[
                        { name: t('Rename'), onClick: () => onRename({ accountId: account.id }) },
                        {
                            name: t('settings_backup_seed'),
                            onClick: () => onRecovery({ accountId: account.id })
                        },
                        {
                            name: t('settings_delete_account'),
                            onClick: () => onDelete({ accountId: account.id })
                        }
                    ]}
                />
            </Row>
            {sortedWallets.length === 1 && (
                <MultisigsGroupRows hostWalletId={sortedWallets[0].id} tabLevel={tabLevel + 1} />
            )}
            {sortedWallets.length > 1 &&
                sortedWallets.map(wallet => (
                    <Fragment key={wallet.id}>
                        <Row $tabLevel={tabLevel + 1}>
                            <DragHandleMock />
                            <Label2Styled>
                                {toShortValue(formatAddress(wallet.rawAddress, network))}
                            </Label2Styled>
                            <WalletVersionBadgeStyled size="s" walletVersion={wallet.version} />
                        </Row>
                        <MultisigsGroupRows hostWalletId={wallet.id} tabLevel={tabLevel + 2} />
                    </Fragment>
                ))}
        </>
    );
};

const AccountLedgerRow: FC<{
    account: AccountLedger;
    dragHandleProps: DraggableProvidedDragHandleProps | null | undefined;
    tabLevel: number;
}> = ({ account, dragHandleProps, tabLevel }) => {
    const network = useActiveTonNetwork();
    const { t } = useTranslation();
    const { onRename, onDelete } = useAccountOptions();

    const sortedDerivations = account.derivations.slice().sort(sortDerivationsByIndex);
    return (
        <>
            <Row $tabLevel={tabLevel}>
                <Icon {...dragHandleProps}>
                    <ReorderIcon />
                </Icon>
                <WalletEmoji emojiSize="16px" containerSize="16px" emoji={account.emoji} />
                <Label2Styled>{account.name}</Label2Styled>
                <AccountBadgeStyled accountType={account.type} size="s" />
                <AccountMenu
                    options={[
                        { name: t('Rename'), onClick: () => onRename({ accountId: account.id }) },
                        {
                            name: t('settings_delete_account'),
                            onClick: () => onDelete({ accountId: account.id })
                        }
                    ]}
                />
            </Row>
            {sortedDerivations.length > 1 &&
                sortedDerivations.map(derivation => {
                    const wallet = derivation.tonWallets.find(
                        w => w.id === derivation.activeTonWalletId
                    )!;

                    return (
                        <Row key={derivation.index} $tabLevel={tabLevel + 1}>
                            <DragHandleMock />
                            <Label2Styled>
                                {toShortValue(formatAddress(wallet.rawAddress, network))}
                            </Label2Styled>
                            <WalletIndexBadgeStyled size="s">
                                {'#' + (derivation.index + 1)}
                            </WalletIndexBadgeStyled>
                        </Row>
                    );
                })}
        </>
    );
};

const AccountTonOnlyRow: FC<{
    account: AccountTonOnly;
    dragHandleProps: DraggableProvidedDragHandleProps | null | undefined;
    tabLevel: number;
}> = ({ account, dragHandleProps, tabLevel }) => {
    const network = useActiveTonNetwork();
    const { t } = useTranslation();
    const { onRename, onDelete } = useAccountOptions();

    const sortedWallets = account.tonWallets.slice().sort(sortWalletsByVersion);
    return (
        <>
            <Row $tabLevel={tabLevel}>
                <Icon {...dragHandleProps}>
                    <ReorderIcon />
                </Icon>
                <WalletEmoji emojiSize="16px" containerSize="16px" emoji={account.emoji} />
                <Label2Styled>{account.name}</Label2Styled>
                <AccountBadgeStyled accountType={account.type} size="s" />
                <AccountMenu
                    options={[
                        { name: t('Rename'), onClick: () => onRename({ accountId: account.id }) },
                        {
                            name: t('settings_delete_account'),
                            onClick: () => onDelete({ accountId: account.id })
                        }
                    ]}
                />
            </Row>
            {sortedWallets.length === 1 && (
                <MultisigsGroupRows hostWalletId={sortedWallets[0].id} tabLevel={tabLevel + 1} />
            )}
            {sortedWallets.length > 1 &&
                sortedWallets.map(wallet => (
                    <Fragment key={wallet.id}>
                        <Row $tabLevel={tabLevel}>
                            <DragHandleMock />
                            <Label2Styled>
                                {toShortValue(formatAddress(wallet.rawAddress, network))}
                            </Label2Styled>
                            <WalletVersionBadgeStyled size="s" walletVersion={wallet.version} />
                        </Row>
                        <MultisigsGroupRows hostWalletId={wallet.id} tabLevel={tabLevel + 2} />
                    </Fragment>
                ))}
        </>
    );
};

const AccountKeystoneRow: FC<{
    account: AccountKeystone;
    dragHandleProps: DraggableProvidedDragHandleProps | null | undefined;
    tabLevel: number;
}> = ({ account, dragHandleProps, tabLevel }) => {
    const { t } = useTranslation();
    const { onRename, onDelete } = useAccountOptions();
    return (
        <Row $tabLevel={tabLevel}>
            <Icon {...dragHandleProps}>
                <ReorderIcon />
            </Icon>
            <WalletEmoji emojiSize="16px" containerSize="16px" emoji={account.emoji} />
            <Label2Styled>{account.name}</Label2Styled>
            <AccountBadgeStyled accountType={account.type} size="s" />
            <AccountMenu
                options={[
                    { name: t('Rename'), onClick: () => onRename({ accountId: account.id }) },
                    {
                        name: t('settings_delete_account'),
                        onClick: () => onDelete({ accountId: account.id })
                    }
                ]}
            />
        </Row>
    );
};

const AccountWatchOnlyRow: FC<{
    account: AccountTonWatchOnly;
    dragHandleProps: DraggableProvidedDragHandleProps | null | undefined;
    tabLevel: number;
}> = ({ account, dragHandleProps, tabLevel }) => {
    const { t } = useTranslation();
    const { onRename, onDelete } = useAccountOptions();
    return (
        <Row $tabLevel={tabLevel}>
            <Icon {...dragHandleProps}>
                <ReorderIcon />
            </Icon>
            <WalletEmoji emojiSize="16px" containerSize="16px" emoji={account.emoji} />
            <Label2Styled>{account.name}</Label2Styled>
            <AccountBadgeStyled accountType={account.type} size="s" />
            <AccountMenu
                options={[
                    { name: t('Rename'), onClick: () => onRename({ accountId: account.id }) },
                    {
                        name: t('settings_delete_account'),
                        onClick: () => onDelete({ accountId: account.id })
                    }
                ]}
            />
        </Row>
    );
};

const AccountMAMRow: FC<{
    account: AccountMAM;
    dragHandleProps: DraggableProvidedDragHandleProps | null | undefined;
    tabLevel: number;
}> = ({ account, dragHandleProps, tabLevel }) => {
    const { t } = useTranslation();
    const { onRename, onDelete, onRecovery } = useAccountOptions();
    const sortedDerivations = account.derivations.slice().sort(sortDerivationsByIndex);
    return (
        <>
            <Row $tabLevel={tabLevel}>
                <Icon {...dragHandleProps}>
                    <ReorderIcon />
                </Icon>
                <WalletEmoji emojiSize="16px" containerSize="16px" emoji={account.emoji} />
                <Label2Styled>{account.name}</Label2Styled>
                <AccountBadgeStyled accountType={account.type} size="s" />
                <AccountMenu
                    options={[
                        { name: t('Rename'), onClick: () => onRename({ accountId: account.id }) },
                        {
                            name: t('settings_backup_seed'),
                            onClick: () => onRecovery({ accountId: account.id })
                        },
                        {
                            name: t('settings_delete_account'),
                            onClick: () => onDelete({ accountId: account.id })
                        }
                    ]}
                />
            </Row>
            {sortedDerivations.map(derivation => {
                return (
                    <Fragment key={derivation.index}>
                        <Row $tabLevel={tabLevel + 1}>
                            <DragHandleMock />
                            <WalletEmoji
                                emojiSize="16px"
                                containerSize="16px"
                                emoji={derivation.emoji}
                            />
                            <Label2Styled>{derivation.name}</Label2Styled>
                            <WalletIndexBadgeStyled size="s">
                                {'#' + (derivation.index + 1)}
                            </WalletIndexBadgeStyled>
                            <AccountMenu
                                options={[
                                    {
                                        name: t('Rename'),
                                        onClick: () =>
                                            onRename({
                                                accountId: account.id,
                                                derivationIndex: derivation.index
                                            })
                                    },
                                    {
                                        name: t('settings_backup_seed'),
                                        onClick: () =>
                                            onRecovery({
                                                accountId: account.id,
                                                walletId: derivation.activeTonWalletId
                                            })
                                    }
                                ]}
                            />
                        </Row>
                        <MultisigsGroupRows
                            hostWalletId={derivation.activeTonWalletId}
                            tabLevel={tabLevel + 2}
                        />
                    </Fragment>
                );
            })}
        </>
    );
};

const AccountMultisigRow = () => {
    return null;
};

const AccountRow: FC<{
    account: Account;
    dragHandleProps: DraggableProvidedDragHandleProps | null | undefined;
    tabLevel: number;
}> = ({ account, ...rest }) => {
    switch (account.type) {
        case 'mnemonic':
            return <AccountMnemonicRow account={account} {...rest} />;
        case 'ledger':
            return <AccountLedgerRow account={account} {...rest} />;
        case 'ton-only':
            return <AccountTonOnlyRow account={account} {...rest} />;
        case 'keystone':
            return <AccountKeystoneRow account={account} {...rest} />;
        case 'watch-only':
            return <AccountWatchOnlyRow account={account} {...rest} />;
        case 'mam':
            return <AccountMAMRow account={account} {...rest} />;
        case 'ton-multisig':
            return <AccountMultisigRow />;
        default:
            assertUnreachable(account);
    }
};

const ItemRow: FC<{
    item: Account | AccountsFolder;
    dragHandleProps: DraggableProvidedDragHandleProps | null | undefined;
    tabLevel?: number;
}> = ({ item, dragHandleProps, tabLevel = 0 }) => {
    const { t } = useTranslation();
    const accounts = useAccountsState();
    const { onOpen: onManageFolder } = useManageFolderNotification();
    const { mutate: deleteFolder } = useDeleteFolder();

    if (item.type === 'folder') {
        return (
            <>
                <Row $tabLevel={tabLevel}>
                    <Icon {...dragHandleProps}>
                        <ReorderIcon />
                    </Icon>
                    <Icon>
                        <FolderIcon />
                    </Icon>
                    <Label2Styled>{item.name}</Label2Styled>
                    <AccountMenu
                        options={[
                            {
                                name: t('accounts_manage_folder'),
                                onClick: () => onManageFolder({ folderId: item.id })
                            },
                            {
                                name: t('accounts_delete_folder'),
                                onClick: () => deleteFolder(item)
                            }
                        ]}
                    />
                </Row>
                {item.accounts.map(acc => (
                    <ItemRow
                        key={acc}
                        item={accounts.find(a => a.id === acc)!}
                        dragHandleProps={dragHandleProps}
                        tabLevel={1}
                    />
                ))}
            </>
        );
    }

    return <AccountRow account={item} dragHandleProps={dragHandleProps} tabLevel={tabLevel} />;
};
