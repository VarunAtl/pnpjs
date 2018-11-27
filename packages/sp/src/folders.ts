import { extend, TypedHash, jsS } from "@pnp/common";
import { SharePointQueryable, SharePointQueryableCollection, SharePointQueryableInstance, defaultPath } from "./sharepointqueryable";
import { SharePointQueryableShareableFolder } from "./sharepointqueryableshareable";
import { Files } from "./files";
import { odataUrlFrom } from "./odata";
import { Item } from "./items";
import { SPHttpClient } from "./net/sphttpclient";

/**
 * Describes a collection of Folder objects
 *
 */
@defaultPath("folders")
export class Folders extends SharePointQueryableCollection {

    /**
     * Gets a folder by folder name
     *
     */
    public getByName(name: string): Folder {
        const f = new Folder(this);
        f.concat(`('${name}')`);
        return f;
    }

    /**
     * Adds a new folder to the current folder (relative) or any folder (absolute)
     *
     * @param url The relative or absolute url where the new folder will be created. Urls starting with a forward slash are absolute.
     * @returns The new Folder and the raw response.
     */
    public add(url: string): Promise<FolderAddResult> {

        return this.clone(Folders, `add('${url}')`).postCore().then((response) => {
            return {
                data: response,
                folder: this.getByName(url),
            };
        });
    }
}

/**
 * Describes a single Folder instance
 *
 */
export class Folder extends SharePointQueryableShareableFolder {

    /**
     * Specifies the sequence in which content types are displayed.
     *
     */
    public get contentTypeOrder(): SharePointQueryableCollection {
        return new SharePointQueryableCollection(this, "contentTypeOrder");
    }

    /**
     * Gets this folder's files
     *
     */
    public get files(): Files {
        return new Files(this);
    }

    /**
     * Gets this folder's sub folders
     *
     */
    public get folders(): Folders {
        return new Folders(this);
    }

    /**
     * Gets this folder's list item field values
     *
     */
    public get listItemAllFields(): SharePointQueryableInstance {
        return new SharePointQueryableInstance(this, "listItemAllFields");
    }

    /**
     * Gets the parent folder, if available
     *
     */
    public get parentFolder(): Folder {
        return new Folder(this, "parentFolder");
    }

    /**
     * Gets this folder's properties
     *
     */
    public get properties(): SharePointQueryableInstance {
        return new SharePointQueryableInstance(this, "properties");
    }

    /**
     * Gets this folder's server relative url
     *
     */
    public get serverRelativeUrl(): SharePointQueryable {
        return new SharePointQueryable(this, "serverRelativeUrl");
    }

    /**
     * Gets a value that specifies the content type order.
     *
     */
    public get uniqueContentTypeOrder(): SharePointQueryableCollection {
        return new SharePointQueryableCollection(this, "uniqueContentTypeOrder");
    }

    public update = this._update<FolderUpdateResult, TypedHash<any>>("SP.Folder", data => ({ data, folder: this }));

    /**
    * Delete this folder
    *
    * @param eTag Value used in the IF-Match header, by default "*"
    */
    public delete(eTag = "*"): Promise<void> {
        return this.clone(Folder, null).postCore({
            headers: {
                "IF-Match": eTag,
                "X-HTTP-Method": "DELETE",
            },
        });
    }

    /**
     * Moves the folder to the Recycle Bin and returns the identifier of the new Recycle Bin item.
     */
    public recycle(): Promise<string> {
        return this.clone(Folder, "recycle").postCore();
    }

    /**
     * Gets the associated list item for this folder, loading the default properties
     */
    public getItem<T>(...selects: string[]): Promise<Item & T> {

        const q = this.listItemAllFields;
        return q.select.apply(q, selects).get().then((d: any) => {

            return extend(new Item(odataUrlFrom(d)), d);
        });
    }

    /**
     * Moves a folder to destination path
     *
     * @param destUrl Absolute or relative URL of the destination path
     */
    public moveTo(destUrl: string): Promise<void> {
        return this.select("ServerRelativeUrl").get().then(({ ServerRelativeUrl: srcUrl }) => {
            const client = new SPHttpClient();
            const webBaseUrl = this.toUrl().split("/_api")[0];
            const hostUrl = webBaseUrl.replace("://", "___").split("/")[0].replace("___", "://");
            const methodUrl = `${webBaseUrl}/_api/SP.MoveCopyUtil.MoveFolder()`;
            return client.post(methodUrl, {
                body: jsS({
                    destUrl: destUrl.indexOf("http") === 0 ? destUrl : `${hostUrl}${destUrl}`,
                    srcUrl: `${hostUrl}${srcUrl}`,
                }),
            }).then(r => r.json());
        });
    }

}

export interface FolderAddResult {
    folder: Folder;
    data: any;
}

export interface FolderUpdateResult {
    folder: Folder;
    data: any;
}
