import { NgModule } from '@angular/core';
import { NbToggleModule, NbSelectModule } from '@nebular/theme';
import {
  NbButtonModule,
  NbCardModule,
} from '@nebular/theme';

import { ThemeModule } from '../../@theme/theme.module';

import { EditorsRoutingModule, routedComponents } from './editors-routing.module';
import { VoiceroidEditiorComponent } from './voiceroid-editor/voiceroid-editor.component';
import { FormsModule } from '@angular/forms';
import { SandboxComponent } from './sandbox/sandbox.component';
import { Ng2SmartTableModule } from 'ng2-smart-table';

@NgModule({
  imports: [
    NbCardModule,
    ThemeModule,
    EditorsRoutingModule,
    NbButtonModule,
    NbToggleModule,
    FormsModule,
    NbSelectModule,
    Ng2SmartTableModule,
  ],
  declarations: [
    ...routedComponents,
    VoiceroidEditiorComponent,
    SandboxComponent,
  ],
})
export class EditorsModule { }
