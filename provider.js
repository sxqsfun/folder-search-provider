import Gio from 'gi://Gio'

export default class FolderProvider {
  constructor(extension) {
    this.extension = extension
    this.appInfo = extension.getApp().appInfo
  }

  activateResult(folder) {
    let root = this.extension.getRoot()
    let app = this.extension.getApp()
    if (app && root) {
      try {
        let current = root;
        for (const part of folder.split('/')) {
            current = current.get_child(part);
        }
        app.app_info.launch([current], null);
      } catch (e) {
        console.error(e)
      }
    }
  }

  filterResults(results, maxResults) {
    return results.slice(0, maxResults)
  }

  async getInitialResultSet(terms) {
    return this.getSubsearchResultSet(this.workspaces, terms)
  }

  async getSubsearchResultSet(previousResults, terms) {
    let root = this.extension.getRoot()
    let app = this.extension.getApp()
    if (!app || !root) return []
    return terms.reduce(
      (result, term) => result.filter(i => i.toLowerCase().includes(term)),
      this.#loadFolders(root)
    )
  }

  async getResultMetas(folders) {
    let app = this.extension.getApp()
    return folders.map(folder => ({
      id: folder,
      name: folder,
      createIcon: size => app && app.create_icon_texture(size)
    }))
  }

  #loadFolders(root) {
    const folders = [];
    try {
      let enumerator = root.enumerate_children(
        'standard::name,standard::type',
        Gio.FileQueryInfoFlags.NONE,
        null
      )
      
        let info1;
        while ((info1 = enumerator.next_file(null)) !== null) {
            if (info1.get_file_type() !== Gio.FileType.DIRECTORY) continue;

            const name1 = info1.get_name();
            folders.push(name1); // 第一层：如 "project"

            // 进入第二层
            const child1 = root.get_child(name1);
            try {
                const enumerator2 = child1.enumerate_children(
                    'standard::name,standard::type',
                    Gio.FileQueryInfoFlags.NONE,
                    null
                );

                let info2;
                while ((info2 = enumerator2.next_file(null)) !== null) {
                    if (info2.get_file_type() !== Gio.FileType.DIRECTORY) continue;
                    const name2 = info2.get_name();
                    folders.push(name1 + '/' + name2); // 第二层：如 "project/src"
                }
                enumerator2.close(null);
            } catch (e) {
                console.error(e)
                // 忽略错误（如无权限）
            }
        }      
     
      enumerator.close(null)
    } catch (e) {
      console.error(e)
    } finally {
      return folders
    }
  }
}
