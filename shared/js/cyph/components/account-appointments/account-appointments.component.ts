import {
	AfterViewInit,
	ChangeDetectionStrategy,
	Component,
	ViewChild
} from '@angular/core';
import {Options} from 'fullcalendar';
import memoize from 'lodash-es/memoize';
import {CalendarComponent} from 'ng-fullcalendar';
import {combineLatest, Observable, of} from 'rxjs';
import {map, mergeMap, take} from 'rxjs/operators';
import {User} from '../../account/user';
import {BaseProvider} from '../../base-provider';
import {AccountUserTypes, CallTypes, IAccountFileRecord, IAppointment} from '../../proto';
import {AccountContactsService} from '../../services/account-contacts.service';
import {AccountFilesService} from '../../services/account-files.service';
import {AccountUserLookupService} from '../../services/account-user-lookup.service';
import {AccountService} from '../../services/account.service';
import {AccountAuthService} from '../../services/crypto/account-auth.service';
import {AccountDatabaseService} from '../../services/crypto/account-database.service';
import {DatabaseService} from '../../services/database.service';
import {EnvService} from '../../services/env.service';
import {StringsService} from '../../services/strings.service';
import {trackByID} from '../../track-by/track-by-id';
import {filterUndefined} from '../../util/filter';
import {observableAll} from '../../util/observable-all';
import {getDateTimeString, watchTimestamp} from '../../util/time';


/**
 * Angular component for account appointments UI.
 */
@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	selector: 'cyph-account-appointments',
	styleUrls: ['./account-appointments.component.scss'],
	templateUrl: './account-appointments.component.html'
})
export class AccountAppointmentsComponent extends BaseProvider implements AfterViewInit {
	/** Time in ms when user can check in - also used as cuttoff point for end time. */
	private readonly appointmentGracePeriod: number	= 600000;

	/** @ignore */
	private calendarEvents: {end: number; start: number; title: string}[]	= [];

	/** Gets appointment. */
	private readonly getAppointment:
		(record: IAccountFileRecord) => Observable<
			{appointment: IAppointment; friend?: string}|undefined
		>
	= memoize(
		(record: IAccountFileRecord) => this.accountFilesService.watchAppointment(record).pipe(
			map(appointment => {
				const currentUser	= this.accountDatabaseService.currentUser.value;

				if (!currentUser) {
					return;
				}

				const friend		= (appointment.participants || []).
					filter(participant => participant !== currentUser.user.username)
				[0];

				return {appointment, friend};
			})
		),
		(record: IAccountFileRecord) => record.id
	);

	/** @ignore */
	private readonly unfilteredAppointments	= this.getAppointments(
		this.accountFilesService.filesListFiltered.appointments
	);

	/** @see AccountUserTypes */
	public readonly accountUserTypes: typeof AccountUserTypes	= AccountUserTypes;

	/** Appointment lists. */
	public readonly appointments	= {
		current: combineLatest(this.unfilteredAppointments, watchTimestamp()).pipe(
			map(([appointments, now]) => appointments.filter(({appointment}) =>
				!appointment.occurred &&
				(now + this.appointmentGracePeriod) >= appointment.calendarInvite.startTime &&
				(now - this.appointmentGracePeriod) <= appointment.calendarInvite.endTime
			))
		),
		future: combineLatest(this.unfilteredAppointments, watchTimestamp()).pipe(
			map(([appointments, now]) => appointments.filter(({appointment}) =>
				!appointment.occurred &&
				(now + this.appointmentGracePeriod) < appointment.calendarInvite.startTime
			))
		),
		incoming: this.getAppointments(
			this.accountFilesService.incomingFilesFiltered.appointments
		),
		past: combineLatest(this.unfilteredAppointments, watchTimestamp()).pipe(
			map(([appointments, now]) => appointments.filter(({appointment}) =>
				appointment.occurred || (
					(now - this.appointmentGracePeriod) > appointment.calendarInvite.endTime
				)
			))
		)
	};

	/** @see CalendarComponent */
	@ViewChild(CalendarComponent) public calendar?: CalendarComponent;

	/** Calendar configuration. */
	public readonly calendarOptions: Options	= {
		aspectRatio: 1.5,
		defaultView: 'agendaDay',
		editable: false,
		eventLimit: false,
		eventSources: [
			{
				events: (_START: any, _END: any, _TIMEZONE: any, callback: Function) => {
					callback(this.calendarEvents);
				}
			}
		],
		header: {
			center: 'title',
			left: 'prev,next today',
			right: 'month,agendaWeek,agendaDay,listMonth'
		},
		timezone: 'local'
	};

	/** @see CallTypes */
	public readonly callTypes: typeof CallTypes	= CallTypes;

	/** @see getDateTimeSting */
	public readonly getDateTimeString: typeof getDateTimeString				= getDateTimeString;

	/** Gets user. */
	public readonly getUser: (username: string) => Promise<User|undefined>	=
		memoize(async (username: string) =>
			this.accountUserLookupService.getUser(username, false)
		)
	;

	/** @see trackByID */
	public readonly trackByID: typeof trackByID		= trackByID;

	/** Calendar clickButton event handler. */
	public calendarClickButton (_EVENT_DETAIL: any) : void {}

	/** Calendar eventClick event handler. */
	public calendarEventClick (_EVENT_DETAIL: any) : void {}

	/** Calendar eventDrop/eventResize event handler. */
	public calendarUpdateEvent (_EVENT_DETAIL: any) : void {}

	/** Current time - used to check if appointment is within range. */
	public readonly timestampWatcher: Observable<number>	= watchTimestamp();

	/** @ignore */
	private getAppointments (recordsList: Observable<IAccountFileRecord[]>) : Observable<{
		appointment: IAppointment;
		friend?: string;
		record: IAccountFileRecord;
	}[]> {
		return recordsList.pipe(
			mergeMap(records => observableAll(
				records.map(record =>
					this.getAppointment(record).pipe(map(appointment =>
						appointment ? {id: record.id, record, ...appointment} : undefined
					))
				).concat(
					/* Workaround for it not emitting when recordsList changes */
					of(undefined)
				)
			)),
			map(filterUndefined)
		);
	}

	/** Accepts appointment request. */
	public async accept ({appointment, friend, record}: {
		appointment: IAppointment;
		friend?: string;
		record: IAccountFileRecord;
	}) : Promise<void> {
		await Promise.all([
			this.accountFilesService.acceptIncomingFile(record),
			!friend && !appointment.fromEmail ? undefined : this.databaseService.callFunction(
				'appointmentInvite',
				{
					callType:
						appointment.calendarInvite.callType === CallTypes.Audio ?
							'audio' :
						appointment.calendarInvite.callType === CallTypes.Video ?
							'video' :
							undefined
					,
					eventDetails: {
						endTime: appointment.calendarInvite.endTime,
						startTime: appointment.calendarInvite.startTime
					},
					to: friend || {email: appointment.fromEmail, name: appointment.fromName}
				}
			)
		]);
	}

	/** @inheritDoc */
	public async ngAfterViewInit () : Promise<void> {
		this.accountService.transitionEnd();

		if (this.calendar) {
			await this.calendar.initialized.pipe(take(1)).toPromise();
		}

		this.subscriptions.push(this.unfilteredAppointments.subscribe(appointments => {
			this.calendarEvents	= appointments.map(({appointment}) => ({
				end: appointment.calendarInvite.endTime,
				start: appointment.calendarInvite.startTime,
				title: appointment.calendarInvite.title
			}));

			if (this.calendar) {
				this.calendar.fullCalendar('refetchEvents');
			}
		}));
	}

	constructor (
		/** @ignore */
		public readonly databaseService: DatabaseService,

		/** @see AccountAuthService */
		public readonly accountAuthService: AccountAuthService,

		/** @see AccountService */
		public readonly accountService: AccountService,

		/** @see AccountContactsService */
		public readonly accountContactsService: AccountContactsService,

		/** @see AccountDatabaseService */
		public readonly accountDatabaseService: AccountDatabaseService,

		/** @see AccountFilesService */
		public readonly accountFilesService: AccountFilesService,

		/** @see AccountUserLookupService */
		public readonly accountUserLookupService: AccountUserLookupService,

		/** @see EnvService */
		public readonly envService: EnvService,

		/** @see StringsService */
		public readonly stringsService: StringsService
	) {
		super();
	}
}
