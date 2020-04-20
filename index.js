const core = require('@actions/core');
const github = require('@actions/github');

async function run(){
    try{
        if(github.context.payload.action){
            if(github.content.payload.action !=="closed") return
        }

        const imageSize= core.getInput('imageSize');
    
        const token = process.env['GITHUB_TOKEN']

        if (!token){
            throw "Token not found"
        }

        const octokit = new github.GitHub(token);
        const nwo = process.env['GITHUB_REPOSITORY'] || '/'
        const [owner, repo] = nwo.split('/')
        
        const readme= await octokit.request(`GET /repos/${owner}/${repo}/readme`,{
            headers: {
                authorization: `token ${token}`,
              },
        })

        const contributors_list = await octokit.request(`GET /repos/${owner}/${repo}/contributors`,{
            headers: {
                authorization: `token ${token}`,
              },
        })
        //readme.data has the readme value

        const content = Buffer.from(readme.data.content,'base64').toString('ascii')
        
        let  preprocess_content= content.split("# ")
        let pos=null;

        for(let i=0;i<preprocess_content.length;i++){
            if (preprocess_content[i].includes("Contributors List")){
                pos=i;
                break;
            }
        }
        let contributors_content=""

        contributors_list.data.forEach(function(el){
            if(!el.login.includes("bot")){
                const image=`[![${el.login}](${el.avatar_url}&s=${imageSize})](https://github.com/${el.login})`
                contributors_content+=image
            }
        })
        
        const template =`Contributors List\n${contributors_content}`

        if(pos!==null){
            preprocess_content[pos]=template
        }
        else{
            preprocess_content.push(template)
        }

        const postprocess_content= preprocess_content.join("# ")

        const base64String = Buffer.from(postprocess_content).toString('base64')

        const updateReadme = await octokit.request(`PUT /repos/${owner}/${repo}/contents/README.md`,{
            headers: {
                authorization: `token ${token}`,
              },
              "message": "contrib-auto-update",
            "content": base64String,
            "sha": readme.data.sha
        })
         console.log("updated readme")
    }
    catch(error){
        core.setFailed(error.message)
    }
}

run();