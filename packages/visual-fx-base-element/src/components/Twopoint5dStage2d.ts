import {consume} from '@lit/context';
import {createEffect, createSignal, value, type SignalFuncs, type SignalReader} from '@spearwolf/signalize';
import {
  OrthographicProjection,
  ParallaxProjection,
  Stage2D,
  type Display,
  type IProjection,
  type OrthographicProjectionSpecs,
  type ParallaxProjectionSpecs,
  type ProjectionPlaneDescription,
} from '@spearwolf/twopoint5d';
import {css, html} from 'lit';
import {property} from 'lit/decorators.js';
import {twopoint5dDisplayContext} from '../context/twopoint5d-display-context.js';
import {StageResize, type StageResizeProps} from '../events.js';
import {SignalMap} from '../utils/SignalMap.js';
import {VisualFxBaseElement} from './VisualFxBaseElement.js';

export class Twopoint5dStage2d extends VisualFxBaseElement {
  static override styles = css`
    :host {
      display: inline;
    }
  `;

  @property({type: String, reflect: true})
  accessor name: string | undefined;

  @consume({context: twopoint5dDisplayContext, subscribe: true})
  @property({attribute: false})
  accessor displayCtx: Display | undefined;

  readonly #display: SignalFuncs<Display | undefined> = createSignal();

  get display(): Display | undefined {
    return value(this.#display[0]);
  }

  get display$(): SignalReader<Display | undefined> {
    return this.#display[0];
  }

  set display(value: Display | undefined) {
    this.#display[1](value);
  }

  @property({type: String, reflect: true})
  accessor fit: 'contain' | 'cover' | 'fill' | undefined;

  @property({type: Number, reflect: true})
  accessor width: number | undefined;

  @property({type: Number, reflect: true})
  accessor height: number | undefined;

  @property({type: Number, reflect: true, attribute: 'pixel-zoom'})
  accessor pixelZoom: number | undefined;

  @property({type: Number, reflect: true, attribute: 'min-pixel-zoom'})
  accessor minPixelZoom: number | undefined;

  @property({type: Number, reflect: true, attribute: 'max-pixel-zoom'})
  accessor maxPixelZoom: number | undefined;

  @property({type: Number, reflect: true})
  accessor near: number | undefined;

  @property({type: Number, reflect: true})
  accessor far: number | undefined;

  @property({type: Number, reflect: true, attribute: 'distance-to-projection-plane'})
  accessor distanceToProjectionPlane: number | undefined;

  @property({type: String, reflect: true, attribute: 'projection-plane'})
  accessor projectionPlane: 'xy' | 'xz' | undefined;

  @property({type: String, reflect: true, attribute: 'projection-origin'})
  accessor projectionOrigin: 'bottom-left' | 'top-left' | undefined;

  @property({type: String, reflect: true, attribute: 'projection-type'})
  accessor projectionType: 'parallax' | 'ortho' | 'orthographic' | undefined;

  readonly #projSignals: SignalMap;
  readonly #viewSpecsSignals: SignalMap;

  readonly #projection = createSignal<IProjection | undefined>();

  get projection(): IProjection | undefined {
    return value(this.#projection[0]);
  }

  get projection$(): SignalReader<IProjection | undefined> {
    return this.#projection[0];
  }

  set projection(value: IProjection | undefined) {
    this.#projection[1](value);
  }

  readonly stage2d = new Stage2D();

  constructor() {
    super();

    this.loggerNS = 'twopoint5d-stage2d';

    this.fit = 'contain';

    this.projectionPlane = 'xy';
    this.projectionOrigin = 'bottom-left';

    this.display$((display) => {
      this.logger?.log('requested display context', display);

      // TODO create a StageRenderer interface?
      return display?.on('resize', ({width, height}) => {
        this.stage2d.resize(width, height);
      });
    });

    this.projection$((proj) => {
      this.logger?.log('update projection', {projection: proj, stage: this.stage2d});
      // TODO fix "stageresize" event with width:0 and height:0 issue
      this.stage2d.projection = proj;
    });

    this.#projSignals = SignalMap.fromProps(this, ['projectionPlane', 'projectionOrigin', 'projectionType']);

    this.#viewSpecsSignals = SignalMap.fromProps(this, [
      'fit',
      'width',
      'height',
      'pixelZoom',
      'minPixelZoom',
      'maxPixelZoom',
      'near',
      'far',
      'distanceToProjectionPlane',
    ]);

    createEffect(() => {
      this.onProjectionPropsUpdate();
    }, this.#projSignals.getSignals());

    createEffect(() => {
      this.onViewSpecsPropsUpdate();
    }, [...this.#viewSpecsSignals.getSignals(), this.projection$]);

    this.stage2d.on('resize', (stage2d: Stage2D) => {
      const detail: StageResizeProps = {
        name: stage2d.name,
        width: stage2d.width,
        height: stage2d.height,
        containerWidth: stage2d.containerWidth,
        containerHeight: stage2d.containerHeight,
        stage: stage2d,
      };
      this.dispatchEvent(new CustomEvent<StageResizeProps>(StageResize, {bubbles: true, detail}));
    });
  }

  override willUpdate(changedProperties: Map<PropertyKey, unknown>) {
    super.willUpdate(changedProperties);

    const propKeys = Array.from(changedProperties.keys()) as (keyof this)[];

    this.#projSignals.updateFromProps(this, propKeys);
    this.#viewSpecsSignals.updateFromProps(this, propKeys);
  }

  override render() {
    this.display = this.displayCtx;

    if (this.name) {
      this.stage2d.name = this.name;
    }

    return html`<slot></slot>`;
  }

  private onProjectionPropsUpdate(): void {
    const {projectionPlane, projectionOrigin, projectionType} = this.#projSignals.getValueObject();

    if ([projectionPlane, projectionOrigin, projectionType].some((val) => val == null)) return;

    const planeDescription = `${projectionPlane}|${projectionOrigin}` as ProjectionPlaneDescription;

    if (projectionType === 'parallax') {
      this.projection = new ParallaxProjection(planeDescription);
    } else if ((projectionType as string)?.startsWith('ortho')) {
      this.projection = new OrthographicProjection(planeDescription);
    } else {
      this.projection = undefined;

      if (projectionType != null) {
        this.logger.warn('projection-type not supported:', projectionType);
      }
    }
  }

  private onViewSpecsPropsUpdate(): void {
    const projection = this.projection;
    if (projection) {
      const viewSpecs = this.#viewSpecsSignals.getValueObject() as ParallaxProjectionSpecs | OrthographicProjectionSpecs;
      (projection as ParallaxProjection).viewSpecs = viewSpecs;
    }
  }
}
