import {HttpClientModule} from '@angular/common/http';
import {NgModule} from '@angular/core';
import {FlexLayoutModule} from '@angular/flex-layout';
import {FormsModule} from '@angular/forms';
import {MatButtonModule} from '@angular/material/button';
import {MatDialogModule} from '@angular/material/dialog';
import {MatInputModule} from '@angular/material/input';
import {MatProgressSpinnerModule} from '@angular/material/progress-spinner';
import {MatSelectModule} from '@angular/material/select';
import {BrowserModule} from '@angular/platform-browser';
import {BrowserAnimationsModule} from '@angular/platform-browser/animations';
import {DialogAlertComponent} from '../components/dialog-alert';
import {MarkdownComponent} from '../components/markdown';
import {ConfigService} from '../services/config.service';
import {EnvService} from '../services/env.service';
import {StringsService} from '../services/strings.service';


/**
 * Common module shared by cyph.com and CyphWebModule.
 */
@NgModule({
	declarations: [
		DialogAlertComponent,
		MarkdownComponent
	],
	entryComponents: [
		DialogAlertComponent,
		MarkdownComponent
	],
	exports: [
		BrowserAnimationsModule,
		BrowserModule,
		DialogAlertComponent,
		FlexLayoutModule,
		FormsModule,
		HttpClientModule,
		MarkdownComponent,
		MatButtonModule,
		MatDialogModule,
		MatInputModule,
		MatProgressSpinnerModule,
		MatSelectModule
	],
	imports: [
		BrowserAnimationsModule,
		BrowserModule,
		FlexLayoutModule,
		FormsModule,
		HttpClientModule,
		MatButtonModule,
		MatDialogModule,
		MatInputModule,
		MatProgressSpinnerModule,
		MatSelectModule
	],
	providers: [
		ConfigService,
		EnvService,
		StringsService,
		{
			provide: 'EnvService',
			useExisting: EnvService
		}
	]
})
export class CyphSharedModule {
	constructor () {}
}
