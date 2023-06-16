from youwol.app.environment import YouwolEnvironment
from youwol.app.environment.models import IPipelineFactory
from youwol.app.environment.models_project import BrowserApp, Execution, Link, BrowserAppGraphics
from youwol.pipelines.pipeline_typescript_weback_npm import pipeline, PipelineConfig
from youwol.utils.context import Context


class PipelineFactory(IPipelineFactory):

    def __init__(self, **kwargs):
        super().__init__(**kwargs)

    async def get(self, _env: YouwolEnvironment, context: Context):
        config = PipelineConfig(target=BrowserApp(
            displayName="Explorer",
            execution=Execution(
                standalone=True
            ),
            graphics=BrowserAppGraphics(
                appIcon={
                    "class": "appIcon",
                    "style": {
                        "width": "80px",
                        "height": "80px",
                        "background-image": bgImage,
                        "background-size": "contain",
                        "background-repeat": "no-repeat",
                        "background-position": "center center",
                        "filter": "drop-shadow(rgb(0, 0, 0) 1px 3px 5px)",
                        "border-radius": "20px"
                    }},
                fileIcon={
                    "class": "fileIcon",
                    "style": {
                        "width": "30px",
                        "height": "30px",
                        "background-image": bgImage,
                        "background-size": "contain",
                        "background-repeat": "no-repeat",
                        "background-position": "center center",
                        "filter": "drop-shadow(rgb(0, 0, 0) 1px 3px 5px)",
                        "border-radius": "20px"
                    }
                },
                background={
                    "class": "backgroundIcon",
                    "style": {
                        "width": '100%',
                        "height": '100%',
                        "opacity": 0.3,
                        "z-index": -1,
                        "background-image": bgImage,
                    }
                }
            ),
            links=[
                Link(name="doc", url="dist/docs/index.html"),
                Link(name="coverage", url="coverage/lcov-report/index.html"),
                Link(name="bundle-analysis", url="dist/bundle-analysis.html")
            ]
        ))
        return await pipeline(config, context)


bgImage = "url(data:image/png;base64,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)"
