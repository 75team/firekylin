import { observable, action } from 'mobx';
import { AppStore } from '../../store/app.store';

class IndexStore {
  appStore;
  @observable data = [];
  constructor(appStore: AppStore) {
    this.appStore = appStore;
  }

  @action
  setData = data => this.data = data

}

export default IndexStore;
