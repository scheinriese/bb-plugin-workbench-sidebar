import {describe,expect,it} from "vitest";
import {isNewForYou,countNewChildren} from "./SeenThreads.js";
import {makeSidebarThread} from "../model/fixtures.js";
import type {SidebarThreadDto} from "../../shared/boat-sidebar.js";
const dto=(id:string,fields:Partial<SidebarThreadDto>={}):SidebarThreadDto=>({threadId:id,role:"task",status:"working",provider:"codex",parentThreadId:"lead",createdFor:"you",listedIn:"lead",secondLine:null,rollup:null,hidden:false,updatedAt:"2026-11-07T00:00:00Z",...fields});
describe("Created-for-you opened state",()=>{
 it("shows created-for-you until either the task or its listing chat opens",()=>{const thread={...makeSidebarThread({id:"task"}),boat:dto("task")};expect(isNewForYou(thread,new Set())).toBe(true);expect(isNewForYou(thread,new Set(["task"]))).toBe(false);expect(isNewForYou(thread,new Set(["lead"]))).toBe(false);expect(isNewForYou(thread,null)).toBe(false);});
 it("never marks owner-created Boat chats new",()=>{expect(isNewForYou({...makeSidebarThread({originPluginId:"boat"}),boat:dto("t",{createdFor:null,listedIn:null})},new Set())).toBe(false);});
 it("uses generic visible plugin provenance without inventing creator metadata",()=>{expect(isNewForYou(makeSidebarThread({originPluginId:"automation"}),new Set())).toBe(true);expect(isNewForYou(makeSidebarThread({originPluginId:null}),new Set())).toBe(false);});
 it("counts only visible unopened children for +N new rollups",()=>{const values=[dto("one"),dto("two"),dto("hidden",{hidden:true}),dto("done",{status:"shipped"}),dto("own",{createdFor:null})];const states=new Map(values.map(row=>[row.threadId,row]));expect(countNewChildren("lead",states,new Set())).toBe(2);expect(countNewChildren("lead",states,new Set(["one"]))).toBe(1);expect(countNewChildren("lead",states,new Set(["lead"]))).toBe(0);});
});
