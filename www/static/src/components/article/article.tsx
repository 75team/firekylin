import * as React from 'react';
import { Row, Col, DatePicker, message } from 'antd';
import { inject, observer } from 'mobx-react';
import moment from 'moment';
import { zip } from 'rxjs';
import ArticleHeader from './article-header/article-header';
import ArticleEditor from './article-editor/article-editor';
import ArticleControlHeader from './control-header/control-header';
import ArticleControlCategory from './control-category/control-category';
import ArticleControlTag from './control-tag/control-tag';
import { ArticleProps, ArticleState, PreviewData } from './article.model';
import './article.less';
import { RadioChangeEvent } from 'antd/lib/radio';
import ArticleControlPublic from './control-public/control-public';
import { CheckboxChangeEvent } from 'antd/lib/checkbox';
import ArticleControlAuth from './control-auth/control-auth';
import ArticleControlImage from './control-image/control-image';
import ArticleControlUser from './control-user/control-user';

@inject('sharedStore', 'postStore', 'userStore')
@observer
class PostArticle extends React.Component<ArticleProps, ArticleState> {

    id: number = 0;
    type: number = 0;

    postInfo = this.props.postStore.postInfo;

    state: ArticleState = {
        public: 1,
        auth: {
            comment: true,
        },
        imageUrl: '',
        user: ''
    };

    constructor(props: any) {
        super(props);
        this.id = this.props.match.params.id || 0;
    }
    componentDidMount() {
        const sharedStore = this.props.sharedStore;
        const postStore = this.props.postStore;
        const userStore = this.props.userStore;
        postStore.setPostInfo({status: 0});

        // Get Cats
        const merged$ = zip(sharedStore.getCategoryList$, sharedStore.getDefaultCategory$);
        merged$.subscribe(res => {
            sharedStore.setCategoryList(res[0].data);
            const defaultCategoryAry = res[0].data.filter(cat => cat.id === +res[1].data);
            postStore.setPostInfo({cate: defaultCategoryAry});
        });
        // Get Tags
        sharedStore.getTagList();
        // Get Users
        userStore.getUserList$()
        .subscribe(
            res => {
                userStore.setUserList(res.data);
                // this.setState({
                //     user: this.props.userStore.userList.length > 0 ? this.props.userStore.userList[0].id : '',
                // });
                postStore.setPostInfo({user_id: this.props.userStore.userList.length > 0 ? this.props.userStore.userList[0].id : ''});
            }
        );
    }
    // 发布日期
    onDateChange(date: moment.Moment, dateString: string) {
        console.log(date, dateString);
        this.props.postStore.setPostInfo({create_time: date});
    }
    // Tag
    handleTagChange(tags: string[]) {
        console.log(tags);
        console.log(this.props);
        this.props.postStore.setPostInfo({tag: tags});
    }
    // 是否公开
    handlePublicChange(e: RadioChangeEvent) {
        console.log(e.target.value);
        this.setState({public: e.target.value});
        this.props.postStore.setPostInfo({is_public: e.target.value});
    }
    // 权限控制
    handleAuthChange(e: CheckboxChangeEvent) {
        console.log(e.target.checked);
        this.setState({auth: {comment: e.target.checked}});
        this.props.postStore.setPostInfo({allow_comment: e.target.value});
    }
    // 封面图片
    handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
        console.log(e.target.value);
        this.setState({imageUrl: e.target.value});
        this.props.postStore.setPostInfo({options: {
            featuredImage: e.target.value
        }});
    }
    // 选择作者
    handleUserChange(value: string) {
        this.setState({user: value});
        this.props.postStore.setPostInfo({user_id: value});
    }

    handleSubmit() {
        const { postInfo } = this.props.postStore;
        this.props.postStore.setPostInfo({status: 3});
        const params: any = {};
        if (this.id) {
            params.id = this.id;
        }
        params.status = postInfo.status;
        params.title = postInfo.title;
        params.pathname = postInfo.pathname;
        if (params.status === 3 && !params.markdown_content) {
            // this.setState({ draftSubmitting: false, postSubmitting: false });
            return message.error('没有内容不能提交呢！');
        }
        params.create_time = postInfo.create_time;
        params.markdown_content = postInfo.markdown_content;
        params.type = this.type; // type: 0为文章，1为页面
        params.allow_comment = Number(postInfo.allow_comment);
        params.push_sites = postInfo.options.push_sites;
        params.cate = postInfo.cate.map(cate => cate.id);
        params.tag = postInfo.tag;
        params.user_id = postInfo.user_id;
        params.options = JSON.stringify(postInfo.options);
        // 删除缓存
        localStorage.removeItem('unsavetype' + this.type + 'id' + this.id);
        // 保存
        this.props.postStore.postSubmit(params)
        .subscribe(
            res => {
                if (res.errno === 0) {
                    message.success('发布成功');
                }
            }
        );
    }
    handleSaveDraft() {
        this.props.postStore.setPostInfo({status: 0});
        localStorage.removeItem('unsavetype' + this.type + 'id' + this.id);
    }

    handleTitle(e: React.ChangeEvent<HTMLInputElement>) {
        this.props.postStore.setPostInfo({title: e.target.value});
    }
    handlePath(e: React.ChangeEvent<HTMLInputElement>) {
        this.props.postStore.setPostInfo({pathname: e.target.value});
    }
    preview() {
        const { postInfo } = this.props.postStore;
        const previewData: PreviewData = {
            title: postInfo.title || 'Untitled',
            pathname: postInfo.pathname || 'untitled',
            markdown_content: postInfo.markdown_content,
            create_time: postInfo.create_time,
            update_time: moment().format('YYYY-MM-DD HH:mm:ss'),
            user: this.props.userStore.userList.filter(user => +user.id === +postInfo.user_id)[0],
            comment_num: 0,
            allow_comment: 0,
            options: JSON.stringify(postInfo.options),
        };

        if (this.type === 0) {
            previewData.tag = postInfo.tag
            .map(tagName => { return this.props.sharedStore.tagList.filter(tag => tag.name === tagName)[0] || { name: tagName }; });
            previewData.cate = postInfo.cate;
        }
    
        const previewUrl = `/${['post', 'page'][this.type]}/${previewData.pathname}.html?preview=true`;
    
        let form = document.createElement('form');
        form.setAttribute('method', 'post');
        form.setAttribute('action', previewUrl);
        form.setAttribute('target', '_blank');
    
        let hiddenField = document.createElement('input');
        hiddenField.setAttribute('type', 'hidden');
        hiddenField.setAttribute('name', 'previewData');
        hiddenField.setAttribute('value', JSON.stringify(previewData));
        form.appendChild(hiddenField);
    
        document.body.appendChild(form);
        form.submit();
        document.body.removeChild(form);
    }
    render() {
        const { postInfo } = this.props.postStore;
        const tagList = this.props.sharedStore.tagList;
        return (
            <div className="post-article">
                <Row type="flex">
                    <Col span={18}>
                        <ArticleHeader 
                            {...this.props} 
                            handleTitle={(e: React.ChangeEvent<HTMLInputElement>) => this.handleTitle(e)}
                            handlePath={(e: React.ChangeEvent<HTMLInputElement>) => this.handlePath(e)}
                            preview={() => this.preview()}
                            title={postInfo.title}
                            pathname={postInfo.pathname}
                            status={postInfo.status}
                        />
                        <ArticleEditor />
                    </Col>
                    <Col span={6}>
                        <ArticleControlHeader save={() => this.handleSubmit()} saveDraft={() => this.handleSaveDraft()} />
                        <section className="release-date">
                            <h5>发布日期</h5>
                            <DatePicker placeholder="请选择日期" onChange={(date: moment.Moment, dateString: string) => this.onDateChange(date, dateString)} />
                        </section>
                        <section className="category">
                            <h5>分类</h5>
                            <ArticleControlCategory catInitial={postInfo.cate && postInfo.cate.length > 0 ? postInfo.cate.map(item => item.id) : []} />
                        </section>
                        <section className="category">
                            <h5>标签</h5>
                            <ArticleControlTag tagList={tagList} handleTagChange={(values) => this.handleTagChange(values)} />
                        </section>
                        <section className="category">
                            <h5>公开度</h5>
                            <ArticleControlPublic public={this.state.public} handlePublicChange={e => this.handlePublicChange(e)} />
                        </section>
                        <section className="category">
                            <h5>权限控制</h5>
                            <ArticleControlAuth comment={this.state.auth.comment} handleAuthChange={e => this.handleAuthChange(e)} />
                        </section>
                        <section className="category">
                            <h5>封面图片</h5>
                            <ArticleControlImage imageUrl={this.state.imageUrl} handleImageChange={e => this.handleImageChange(e)} />
                        </section>
                        <section className="category">
                            <h5>选择作者</h5>
                            <ArticleControlUser user={postInfo.user_id} users={this.props.userStore.userList} handleUserChange={value => this.handleUserChange(value)} />
                        </section>
                    </Col>
                </Row>
            </div>
        );
    }
}

export default PostArticle;
