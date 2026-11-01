import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import seed from './lib/seed.json' with {type:'json'};

test('Event cards open the editor, close returns to the list, and duplicates open as drafts',()=>{
 const edit={dataset:{editEvent:'0'}},close={},duplicate={dataset:{duplicateEvent:'0'}};
 const elements={'[data-edit-event]':[edit],'[data-close-event]':[close],'[data-duplicate-event]':[duplicate]};
 const context=vm.createContext({document:{querySelector:()=>null,querySelectorAll:s=>elements[s]||[]},location:{hash:'',pathname:'/'},window:{},crypto,structuredClone,seed});
 const source=readFileSync(new URL('./public/admin.js',import.meta.url),'utf8');
 vm.runInContext(source.slice(0,source.lastIndexOf("$('.modal-close').onclick")),context);
 vm.runInContext("state=structuredClone(seed);render=()=>{};toast=()=>{};imageField=()=>'';bindImageFields=()=>{};forms=()=>{};bind();",context);
 assert.doesNotMatch(vm.runInContext('events()',context),/id="event-editor"/);
 edit.onclick();assert.match(vm.runInContext('events()',context),/id="event-editor"/);
 assert.equal(vm.runInContext('eventIndex',context),0);
 close.onclick();assert.doesNotMatch(vm.runInContext('events()',context),/id="event-editor"/);
 duplicate.onclick();assert.equal(vm.runInContext('state.events[eventIndex].status',context),'draft');
 assert.equal(vm.runInContext('state.events[eventIndex].eventbriteUrl',context),'');
 assert.match(vm.runInContext('events()',context),/id="event-editor"/);
 assert.equal(vm.runInContext("'history' in labels || 'sponsors' in labels",context),false);
});
