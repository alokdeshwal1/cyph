import {Component, Input} from '@angular/core';
import {DomSanitizer, SafeUrl} from '@angular/platform-browser';
import {CustomBuildService} from '../services/custom-build.service';
import {StringsService} from '../services/strings.service';


/**
 * Angular component to display logo.
 */
@Component({
	selector: 'cyph-logo',
	styleUrls: ['../../../css/components/logo.scss'],
	templateUrl: '../../../templates/logo.html'
})
export class LogoComponent {
	/** @ignore */
	private cardHeaderInternal: boolean	= false;

	/** @ignore */
	private iconInternal: boolean		= false;

	/** Possible logos. */
	private readonly logos	= {
		horizontal: {
			main: Promise.resolve(
				this.customBuildService.logoHorizontal ||
				this.domSanitizer.bypassSecurityTrustUrl(
					'/assets/img/logo.white.horizontal.png'
				)
			),
			telehealth:  Promise.resolve(
				this.customBuildService.logoHorizontal ||
				this.domSanitizer.bypassSecurityTrustUrl(
					'/assets/img/logo.telehealth.horizontal.png'
				)
			)
		},
		icon: {
			main:  Promise.resolve(
				this.customBuildService.favicon ||
				this.domSanitizer.bypassSecurityTrustUrl(
					'/assets/img/logo.white.icon.png'
				)
			),
			telehealth:  Promise.resolve(
				this.customBuildService.favicon ||
				this.domSanitizer.bypassSecurityTrustUrl(
					'/assets/img/logo.telehealth.icon.png'
				)
			)
		},
		vertical: {
			main:  Promise.resolve(
				this.customBuildService.logoVertical ||
				this.domSanitizer.bypassSecurityTrustUrl(
					'/assets/img/logo.white.vertical.png'
				)
			),
			telehealth:  Promise.resolve(
				this.customBuildService.logoVertical ||
				this.domSanitizer.bypassSecurityTrustUrl(
					'/assets/img/logo.telehealth.vertical.png'
				)
			)
		},
		video: {
			main:  Promise.resolve(
				this.customBuildService.logoHorizontal ||
				this.domSanitizer.bypassSecurityTrustUrl(
					'/assets/img/betalogo.mobile.png'
				)
			),
			telehealth:  Promise.resolve(
				this.customBuildService.logoHorizontal ||
				this.domSanitizer.bypassSecurityTrustUrl(
					'/assets/img/telehealth.video.logo.png'
				)
			)
		}
	};

	/** @ignore */
	private telehealthInternal: boolean	= false;

	/** @ignore */
	private verticalInternal: boolean	= false;

	/** @ignore */
	private videoInternal: boolean		= false;

	/** Indicates whether image is a logo in a card. */
	@Input()
	public get cardHeader () : boolean {
		return this.cardHeaderInternal;
	}
	public set cardHeader (value: boolean) {
		this.cardHeaderInternal	= (<any> value) === '' ? true : value;
	}

	/** Indicates whether to use icon image. */
	@Input()
	public get icon () : boolean {
		return this.iconInternal;
	}
	public set icon (value: boolean) {
		this.iconInternal	= (<any> value) === '' ? true : value;
	}

	/** Active logo. */
	public get logo () : Promise<SafeUrl> {
		const logoSet	=
			this.icon ?
				this.logos.icon :
				this.vertical ?
					this.logos.vertical :
					this.video ?
						this.logos.video :
						this.logos.horizontal
		;

		return this.telehealth ? logoSet.telehealth : logoSet.main;
	}

	/** Indicates whether to use telehealth image. */
	@Input()
	public get telehealth () : boolean {
		return this.telehealthInternal;
	}
	public set telehealth (value: boolean) {
		this.telehealthInternal	= (<any> value) === '' ? true : value;
	}

	/** Indicates whether to use vertical image. */
	@Input()
	public get vertical () : boolean {
		return this.verticalInternal;
	}
	public set vertical (value: boolean) {
		this.verticalInternal	= (<any> value) === '' ? true : value;
	}

	/** Indicates whether to use video image. */
	@Input()
	public get video () : boolean {
		return this.videoInternal;
	}
	public set video (value: boolean) {
		this.videoInternal	= (<any> value) === '' ? true : value;
	}

	constructor (
		/** @ignore */
		private readonly domSanitizer: DomSanitizer,

		/** @ignore */
		private readonly customBuildService: CustomBuildService,

		/** @see StringsService */
		public readonly stringsService: StringsService
	) {}
}
