import {Component, OnDestroy, OnInit} from '@angular/core';
import {ActivatedRoute} from '@angular/router';
import {BehaviorSubject} from 'rxjs/BehaviorSubject';
import {User} from '../account';
import {States} from '../chat/enums';
import {ChatMessageValueTypes} from '../proto';
import {accountChatProviders} from '../providers';
import {AccountChatService} from '../services/account-chat.service';
import {SessionService} from '../services/session.service';
import {StringsService} from '../services/strings.service';


/**
 * Angular component for account compose UI.
 */
@Component({
	providers: accountChatProviders,
	selector: 'cyph-account-compose',
	styleUrls: ['../../../css/components/account-compose.scss'],
	templateUrl: '../../../templates/account-compose.html'
})
export class AccountComposeComponent implements OnDestroy, OnInit {
	/** @see ChatMessageValueTypes */
	public readonly messageType: ChatMessageValueTypes	= ChatMessageValueTypes.Quill;

	/** @see AccountContactsSearchComponent.userFilter */
	public recipient: BehaviorSubject<User|undefined>	= new BehaviorSubject(undefined);

	/** @see AccountContactsSearchComponent.searchUsername */
	public searchUsername: BehaviorSubject<string>		= new BehaviorSubject('');

	/** Indicates whether message has been sent. */
	public sent: BehaviorSubject<boolean>				= new BehaviorSubject(false);

	/** @inheritDoc */
	public ngOnDestroy () : void {
		this.sessionService.state.isAlive	= false;
	}

	/** @inheritDoc */
	public ngOnInit () : void {
		this.accountChatService.chat.state	= States.chat;
		this.sessionService.state.isAlive	= true;

		this.activatedRouteService.params.subscribe(async o => {
			const username: string|undefined	= o.username;

			if (!username) {
				return;
			}

			this.searchUsername.next(username);
		});
	}

	public async send () : Promise<void> {
		if (!this.recipient.value) {
			return;
		}

		await this.accountChatService.setUser(this.recipient.value.username);
		await this.accountChatService.send(this.messageType);
		this.sent.next(true);
	}

	constructor (
		/** @ignore */
		private readonly activatedRouteService: ActivatedRoute,

		/** @ignore */
		private readonly accountChatService: AccountChatService,

		/** @ignore */
		private readonly sessionService: SessionService,

		/** @see StringsService */
		public readonly stringsService: StringsService
	) {}
}