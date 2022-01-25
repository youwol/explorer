import youwol.pipelines.pipeline_typescript_weback_npm
from youwol.environment.forward_declaration import YouwolEnvironment
from youwol.environment.models import IPipelineFactory
from youwol_utils.context import Context


class PipelineFactory(IPipelineFactory):

    def __init__(self, **kwargs):
        super().__init__(**kwargs)

    async def get(self, _env: YouwolEnvironment, _ctx: Context):
        return youwol.pipelines.pipeline_typescript_weback_npm.pipeline()
