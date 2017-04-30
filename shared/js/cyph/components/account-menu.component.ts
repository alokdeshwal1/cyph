import {Component} from '@angular/core';
import {States, UserPresence} from '../account/enums';
import {AccountAuthService} from '../services/account-auth.service';
import {AccountService} from '../services/account.service';
import {EnvService} from '../services/env.service';
import {UrlStateService} from '../services/url-state.service';


/**
 * Angular component for account home UI.
 */
@Component({
	selector: 'cyph-account-menu',
	styleUrls: ['../../css/components/account-menu.css'],
	templateUrl: '../../templates/account-menu.html'
})
export class AccountMenuComponent {
	/** @see States */
	public states: typeof States	= States;

	/** @see UserPresence */
	public readonly userPresence: typeof UserPresence	= UserPresence;

	/** Goes to state. */
	public async goToState (state: States) : Promise<void> {
		if (this.envService.isMobile) {
			this.accountService.toggleMenu(false);
		}

		this.accountService.state	= state;
		this.urlStateService.setUrl('account/' + States[state]);
	}

	constructor (
		/** @see AccountAuthService */
		public readonly accountAuthService: AccountAuthService,

		/** @see AccountService */
		public readonly accountService: AccountService,

		/** @see EnvAuthService */
		public readonly envService: EnvService,

		/** @see UrlStateService */
		public readonly urlStateService: UrlStateService
	) {
		this.accountService.toggleMenu(!this.envService.isMobile);
	}
}
