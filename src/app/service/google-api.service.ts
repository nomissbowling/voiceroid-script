import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { UserService } from '../@core/mock/users.service';
import { environment } from '../../environments/environment';
import { FileInfo, GoogleFileInfo, PermissionInfo, UserInfo } from '../@core/data/file-info';
import { Subject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class GoogleApiService {

  constructor(private http: HttpClient,
              private userService: UserService) {
    console.log("googleapi init");
    gapi.load('client:auth2', () => {
      gapi.client.init({
        clientId: environment.googleAPIclientID,
        discoveryDocs: ["https://www.googleapis.com/discovery/v1/apis/drive/v3/rest"],
        scope: 'https://www.googleapis.com/auth/drive.file'
      }).then( () => {
        // Listen for sign-in state changes.
        gapi.auth2.getAuthInstance().isSignedIn.listen((s) => this.updateSigninStatus(s));

        // Handle the initial sign-in state.
        this.updateSigninStatus(gapi.auth2.getAuthInstance().isSignedIn.get());
      }, (error) => {
        console.log(error);
      });
    });
  }

  private token: GoogleApiOAuth2TokenObject;
  private user: UserInfo = {displayName: '', emailAddress: '', photoLink: '' };
  private rootId: string = '';
  private projectsId: string = '';

  private currentProjectList: GoogleFileInfo[] = [];
  projectListChange = new Subject<GoogleFileInfo[]>();
  private changeProjectList(projectList:GoogleFileInfo[]){
    this.currentProjectList = projectList;
    this.projectListChange.next(projectList);
  }
  getCurrnetProjectList(): GoogleFileInfo[]{
    return this.currentProjectList;
  }

  private currentProject: GoogleFileInfo = {
    id: '',
    name: '',
    extension: '',
    content: '',
    permissions: undefined,
  };
  projectChange = new Subject<GoogleFileInfo>();
  private changeProject(project: GoogleFileInfo){
    this.currentProject = project;
    this.projectChange.next(project);
  }
  getCurrentProject(): GoogleFileInfo{
    return this.currentProject;
  }

  getCurrentPermission(): PermissionInfo[]{
    if(this.currentProject){
      return this.currentProject.permissions;
    }
    return undefined;
  }

  /**
   *  Called when the signed in status changes, to update the UI
   *  appropriately. After a sign-in, the API is called.
   */
  updateSigninStatus(isSignedIn) {
    console.log("isSignedIn", isSignedIn)
    if (isSignedIn) {
      this.token = gapi.client.getToken();
      this.getUserInfo();
    } else {
      this.token = null;
      this.userService.resetUser();
    }
  }

  // ユーザー情報の取得
  private getUserInfo() {
    if(true)
    {
      const params = {
        fields: "user",
      };
      const url = 'https://www.googleapis.com/drive/v3/about';
      this.http.get(url, {'headers': this.getHeader(),params}).subscribe((data)=>{
        console.log(data);
        this.user = data['user'];
        this.userService.changeUser(this.user);
      });
    }
  }

  // httpヘッダ
  private getHeader(): HttpHeaders{
    return new HttpHeaders({
      Authorization: 'Bearer ' + (this.token ? this.token.access_token : ''),
    });
  }

  // ログイン
  signIn(){
    console.log("signIn()");
    gapi.auth2.getAuthInstance().signIn();
  }

   // ログアウト
  signOut(){
    console.log("signOut()");
    gapi.auth2.getAuthInstance().signOut();
  }

  // Voiceroid Script フォルダの検索 / 作成
  checkRootFolder(){
    this.rootId = '';
    const params = {
      q: "name = 'Voiceroid Script' and mimeType = 'application/vnd.google-apps.folder' and trashed = false and 'me' in owners",
    };
    const url = 'https://www.googleapis.com/drive/v3/files';
    this.http.get(url ,{'headers': this.getHeader(), params}).subscribe((data)=>{
      console.log(data);
      const files = data['files'];
      if( files && files.length>0){
        this.rootId = files[0].id;
      }
      if(this.rootId == ''){
        this.makeRootFolder();
      }
      console.log(this.rootId);
    });
  }

  // Voiceroid Script フォルダの作成
  private makeRootFolder(){
    console.log("makeRootFolder");
    const body = {
      description: "Main Folder for Voiceroid Script",
      mimeType: "application/vnd.google-apps.folder",
      name: "Voiceroid Script",
    };
    const url = 'https://www.googleapis.com/drive/v3/files';
    this.http.post(url , body,{'headers': this.getHeader()}).subscribe((data)=>{
      console.log(data);
      this.rootId = data['id'];
    });
  }

  // Projectsフォルダの検索 / 作成
  checkProjectsFolder(){
    if(this.rootId == ''){return;}
    this.projectsId = '';
    const params = {
      q: "name = 'Projects' and mimeType = 'application/vnd.google-apps.folder' and trashed = false and '" + this.rootId + "' in parents",
    };
    const url = 'https://www.googleapis.com/drive/v3/files';
    this.http.get(url ,{'headers': this.getHeader(), params}).subscribe((data)=>{
      console.log(data);
      const files = data['files'];
      if( files && files.length>0){
        this.projectsId = files[0].id;
      }
      if(this.projectsId == ''){
        this.makeProjectsFolder();
      }
      console.log(this.projectsId);
    });
  }

  // Projectsフォルダの作成
  private makeProjectsFolder(){
    if(this.rootId == ''){return;}
    console.log("makeProjectsFolder");
    const body = {
      description: "Projects Folder for Voiceroid Script",
      mimeType: "application/vnd.google-apps.folder",
      name: "Projects",
      parents: [this.rootId],
    };
    const url = 'https://www.googleapis.com/drive/v3/files';
    this.http.post(url , body,{'headers': this.getHeader()}).subscribe((data)=>{
      console.log(data);
      this.projectsId = data['id'];
    });
  }

  // プロジェクトの作成
  makeNewProject(file: FileInfo){
    if(this.projectsId == ''){return;}
    console.log("makeProjectFile");
    const body = {
      description: "Project File of Voiceroid Script",
      mimeType: "text/plain",
      name: file.name,
      parents: [this.projectsId],
    };
    const url = 'https://www.googleapis.com/drive/v3/files';
    this.http.post(url , body,{'headers': this.getHeader()}).subscribe((data)=>{
      console.log(data);
      this.updateCurrentProject(file, data['id']);
    });
  }

  // 現在のプロジェクトを更新
  updateCurrentProject(file: FileInfo, id: string = ''){
    console.log("update : ", file);
    if(id == ''){id = this.currentProject.id}
    if(id == ''){return;}
    const params = {
      uploadType: "media",
    };
    const url = 'https://www.googleapis.com/upload/drive/v3/files/' + id;
    this.http.patch(url , file.content,{'headers': this.getHeader(),params}).subscribe((data)=>{
      console.log(data);
      const newFile:GoogleFileInfo = {
        id: id,
        name: file.name,
        extension: file.extension,
        content: file.content,
        permissions: undefined,
      }
      this.changeProject(newFile);
    });
  }

  // プロジェクトの一覧を取得
  getProjectList(): any{
    if(this.projectsId == ''){return}
    const params = {
      q: "name contains '.voisproj' and mimeType = 'text/plain' and trashed = false and '" + this.projectsId + "' in parents",
    };
    const url = 'https://www.googleapis.com/drive/v3/files';
    this.http.get(url ,{'headers': this.getHeader(), params}).subscribe((data)=>{
      const newProjectList: GoogleFileInfo[] = [];
      console.log(data);
      const files = data['files'];
      if( files && files.length>0){
        files.forEach(f => {
          newProjectList.push({
            id: f.id,
            name: f.name,
            extension: '.voisproj',
            content: '',
            permissions: undefined,
          });
        });
      }
      this.changeProjectList(newProjectList);
    });
  }

  // プロジェクトを取得
  getProject(id: string): any{
    console.log('get project');
    const newProject: GoogleFileInfo={id:id, name: '', extension: '', content: '', permissions: undefined};
    const params = {
      fields: 'kind, name, mimeType, description'
    };
    const url = 'https://www.googleapis.com/drive/v3/files/' + id;
    this.http.get(url ,{'headers': this.getHeader(), params}).subscribe((data)=>{
      console.log('get file info : ', data);
      if(data['mimeType'] != 'text/plain'){return;}
      newProject.name = data['name'];
      newProject.extension = '.voisproj'; // 要確認
      const responseType = 'text';  // 普通はjson
      const params = {
        alt: 'media',
      };
      const url = 'https://www.googleapis.com/drive/v3/files/' + id;
      this.http.get(url ,{'headers': this.getHeader(), responseType, params}).subscribe((data) =>{
        console.log(data);
        newProject.content = data;
        this.changeProject(newProject);
      });
    });
  }

  // 現在のプロジェクトの権限リストを取得
  getPermission(){
    if(this.currentProject.id == ''){return;}
    const params = {
      fields: 'permissions'
    };
    const url = 'https://www.googleapis.com/drive/v3/files/' + this.currentProject.id + '/permissions';
    this.http.get(url ,{'headers': this.getHeader(), params}).subscribe((data)=>{
      const dataList = data['permissions'];
      const permissions: PermissionInfo[] = [];
      dataList.forEach(permission => {
        permissions.push({
          id: permission.id,  // anyoneWithLink
          type: permission.type,  // anyone
          role: permission.role,  // reader
          targetId: this.currentProject.id,
        });
      });
      console.log(permissions);
      this.currentProject.permissions = permissions;
    });
  }

  // プロジェクトの公開
  makeReleasePermission(){
    if(this.currentProject.id == ''){return;}
    if(this.currentProject.permissions == null){return;}
    this.currentProject.permissions.forEach( p =>{
      if(p.type == 'anyone'){return;}
    });
    console.log('make release permission')
    const body = {
      role: 'reader',
      type: 'anyone',
    };
    const url = 'https://www.googleapis.com/drive/v3/files/' + this.currentProject.id + '/permissions';
    this.http.post(url, body, {'headers': this.getHeader()}).subscribe((data)=>{
      console.log('make : ', data)
      this.getPermission();
    });
  }

  // プロジェクトの非公開
  deleteReleasePermission(){
    if(this.currentProject.id == ''){return;}
    if(this.currentProject.permissions == null){return;}
    let count = 0;
    this.currentProject.permissions.forEach( p =>{
      if(p.type == 'anyone'){
        count += 1;
        console.log('delete release permission')
        const url = 'https://www.googleapis.com/drive/v3/files/' + this.currentProject.id + '/permissions/' + p.id;
        this.http.delete(url, {'headers': this.getHeader()}).subscribe((data)=>{
          console.log('delete : ', data);
        });
      }
    });
    if(count > 0){
      setTimeout(() => {
        this.getPermission();
      }, 5000);
    }
  }

}
