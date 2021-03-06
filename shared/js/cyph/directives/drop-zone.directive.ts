import {
	Directive,
	ElementRef,
	EventEmitter,
	Input,
	OnChanges,
	Output,
	Renderer2
} from '@angular/core';
import * as Dropzone from 'dropzone';
import {BaseProvider} from '../base-provider';
import {IFile} from '../ifile';
import {DialogService} from '../services/dialog.service';
import {EnvService} from '../services/env.service';
import {FileService} from '../services/file.service';
import {StringsService} from '../services/strings.service';
import {uuid} from '../util/uuid';
import {waitUntilTrue} from '../util/wait';


/** File drop zone. */
@Directive({
	selector: '[cyphDropZone]'
})
export class DropZoneDirective extends BaseProvider implements OnChanges {
	/** @ignore */
	private readonly className: string	= 'cyph-drop-zone';

	/** @ignore */
	private dropZone?: Promise<{destroy: () => void}>;

	/** @ignore */
	private readonly id: string	= `id-${uuid()}`;

	/** Optional file type restriction. */
	@Input() public accept?: string;

	/** Indicates whether directive should be active. */
	@Input() public cyphDropZone?: boolean;

	/** Indicates whether cyph-drop-zone class should be added. */
	@Input() public cyphDropZoneClass: boolean	= true;

	/** File drop event emitter. */
	@Output() public readonly fileDrop: EventEmitter<IFile>	= new EventEmitter<IFile>();

	/** @ignore */
	private async confirm (file: {name: string}) : Promise<boolean> {
		return this.dialogService.confirm({
			content: `${this.stringsService.upload} \`${file.name.replace(/\`/g, "'")}\`?`,
			markdown: true,
			title: this.stringsService.uploadFile
		});
	}

	/** @inheritDoc */
	public async ngOnChanges () : Promise<void> {
		this.renderer.addClass(this.elementRef.nativeElement, this.id);

		if (this.dropZone) {
			(await this.dropZone).destroy();
			this.dropZone	= undefined;
		}

		if (this.cyphDropZone === false) {
			this.renderer.removeClass(this.elementRef.nativeElement, this.className);
			return;
		}

		if (!this.elementRef.nativeElement) {
			return;
		}

		this.dropZone	= waitUntilTrue(() =>
			document.body.contains(this.elementRef.nativeElement)
		).then(() => {
			const dropZone	=
				!this.envService.isCordova ?
					(() => {
						const dz	= new Dropzone(`.${this.id}`, {
							accept: async (file, done) => {
								done('ignore');
								dz.removeAllFiles();

								if (await this.confirm(file)) {
									this.fileDrop.emit(await this.fileService.getIFile(file));
								}
							},
							url: 'data:text/plain;ascii,',
							...(this.accept ? {acceptedFiles: this.accept} : {})
						});

						return dz;
					})() :
					(() => {
						const elem: HTMLElement	= this.elementRef.nativeElement;

						const handler			= async () => {
							const o: any	= await (<any> self).chooser.getFile(this.accept);

							if (
								typeof o === 'object' &&
								o.data instanceof Uint8Array &&
								typeof o.mediaType === 'string' &&
								typeof o.name === 'string' &&
								(await this.confirm(o))
							) {
								this.fileDrop.emit(o);
							}
						};

						elem.addEventListener('click', handler);

						return {
							destroy: () => { elem.removeEventListener('click', handler); }
						};
					})()
			;

			if (this.cyphDropZoneClass) {
				this.renderer.addClass(this.elementRef.nativeElement, this.className);
			}

			return dropZone;
		});
	}

	constructor (
		/** @ignore */
		private readonly elementRef: ElementRef,

		/** @ignore */
		private readonly renderer: Renderer2,

		/** @ignore */
		private readonly dialogService: DialogService,

		/** @ignore */
		private readonly envService: EnvService,

		/** @ignore */
		private readonly fileService: FileService,

		/** @ignore */
		private readonly stringsService: StringsService
	) {
		super();
	}
}
