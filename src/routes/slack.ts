import * as qs from "qs";
import * as crypto from "crypto";
import * as express from "express";
import * as bodyParser from "body-parser";

// https://api.slack.com/interactivity/handling#payloads
enum EInteractionType {
  shortcut,
  message_actions,
  block_actions,
  view_submission,
  view_closed,
}

type TTeam = {
  id: string;
  domain: string;
};

type TUser = {
  id: string;
  username: string;
  name: string;
  team_id: string;
};

interface TInteractionAction {
  action_id: string;
  block_id: string;
  value: string;
}

interface IInteraction {
  type: EInteractionType;
  user: TUser;
  team: TTeam;
  token: string;
  trigger_id: string;
}

interface IInteractionBlockAction {
  type: EInteractionType.block_actions;
  api_app_id: string;
  container: {
    type: string;
    message_ts: string;
    channel_id: string;
    is_ephemeral: boolean;
  };
  actions: TInteractionAction[];
}

interface TInteractionShortcut extends IInteraction {
  type: EInteractionType.shortcut;
  action_ts: string;
  callback_id: string;
}

const router = express.Router();

const authenticate = (
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
) => {
  // Your signing secret
  const slackSigningSecret = process.env.SLACK_SECRET as string;

  // Grab the signature and timestamp from the headers
  const requestTimestamp = req.headers["x-slack-request-timestamp"];

  const time = Math.floor(new Date().getTime() / 1000);

  if (Math.abs(time - Number(requestTimestamp)) > 300) {
    res.status(400).send("Ignore this request.");

    return;
  }

  const requestSignature = req.headers["x-slack-signature"] as string;

  /**
   * https://medium.com/@rajat_sriv/verifying-requests-from-slack-using-node-js-69a8b771b704
   */
  const requestBody = qs.stringify(req.body, {
    format: "RFC1738",
  });

  const version = `v0`;

  const base = `${version}:${requestTimestamp}:${requestBody}`;
  const signature = `${version}=${crypto
    .createHmac("sha256", slackSigningSecret)
    .update(base, "utf8")
    .digest("hex")}`;

  const valid = crypto.timingSafeEqual(
    Buffer.from(signature, "utf8"),
    Buffer.from(requestSignature, "utf8")
  );

  if (!valid) {
    next(new Error("Unauthenticated"));

    return;
  }

  next();

  return;
};
/**
 * Much important
 *
 * https://stackoverflow.com/questions/56583305/post-from-slack-for-button-interactions-has-empty-body
 */

router.use(bodyParser.urlencoded({ extended: true }));

router.use(authenticate);
router.post(
  "/interactivity",
  async ({ body: { payload: payloadJSON } }, res) => {
    const payload = JSON.parse(payloadJSON) as IInteraction;

    switch (payload.type) {
      case EInteractionType.block_actions: {
        const {
          actions: [{ action_id, value }],
        } = (payload as unknown) as IInteractionBlockAction;
      }

      case EInteractionType.shortcut: {
        const { callback_id } = (payload as unknown) as TInteractionShortcut;
      }
    }

    return res.sendStatus(200);
  }
);

export default router;
