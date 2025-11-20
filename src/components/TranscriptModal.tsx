import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

interface TranscriptModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  session: any;
}

const TranscriptModal = ({ open, onOpenChange, session }: TranscriptModalProps) => {
  if (!session) return null;

  const hasScore = session.score !== null && session.score !== undefined;
  const hasFeedback = session.feedback && Object.keys(session.feedback).length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>{session.interview_type}</span>
            {hasScore && (
              <Badge variant={session.score >= 70 ? "default" : "secondary"} className="text-lg px-4 py-2">
                Score: {session.score}/100
              </Badge>
            )}
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            {new Date(session.created_at).toLocaleDateString()} at{' '}
            {new Date(session.created_at).toLocaleTimeString()}
          </p>
        </DialogHeader>

        <ScrollArea className="h-[60vh] pr-4">
          {hasFeedback && (
            <div className="mb-6 space-y-4">
              <h3 className="text-lg font-semibold">Performance Analysis</h3>
              
              {session.feedback.summary && (
                <Card className="p-4 bg-muted/30">
                  <p className="text-sm">{session.feedback.summary}</p>
                </Card>
              )}

              {session.feedback.communication && (
                <Card className="p-4">
                  <h4 className="font-semibold mb-2 flex items-center justify-between">
                    Communication Skills
                    <Badge variant="outline">{session.feedback.communication.score}/100</Badge>
                  </h4>
                  <p className="text-sm mb-3">{session.feedback.communication.feedback}</p>
                  {session.feedback.communication.strengths?.length > 0 && (
                    <div className="mb-2">
                      <p className="text-xs font-semibold text-green-600 dark:text-green-400 mb-1">Strengths:</p>
                      <ul className="text-xs space-y-1 pl-4">
                        {session.feedback.communication.strengths.map((s: string, i: number) => (
                          <li key={i} className="list-disc">{s}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {session.feedback.communication.improvements?.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-amber-600 dark:text-amber-400 mb-1">Areas for Improvement:</p>
                      <ul className="text-xs space-y-1 pl-4">
                        {session.feedback.communication.improvements.map((s: string, i: number) => (
                          <li key={i} className="list-disc">{s}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </Card>
              )}

              {session.feedback.technical && (
                <Card className="p-4">
                  <h4 className="font-semibold mb-2 flex items-center justify-between">
                    Technical Knowledge
                    <Badge variant="outline">{session.feedback.technical.score}/100</Badge>
                  </h4>
                  <p className="text-sm mb-3">{session.feedback.technical.feedback}</p>
                  {session.feedback.technical.strengths?.length > 0 && (
                    <div className="mb-2">
                      <p className="text-xs font-semibold text-green-600 dark:text-green-400 mb-1">Strengths:</p>
                      <ul className="text-xs space-y-1 pl-4">
                        {session.feedback.technical.strengths.map((s: string, i: number) => (
                          <li key={i} className="list-disc">{s}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {session.feedback.technical.improvements?.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-amber-600 dark:text-amber-400 mb-1">Areas for Improvement:</p>
                      <ul className="text-xs space-y-1 pl-4">
                        {session.feedback.technical.improvements.map((s: string, i: number) => (
                          <li key={i} className="list-disc">{s}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </Card>
              )}

              {session.feedback.behavioral && (
                <Card className="p-4">
                  <h4 className="font-semibold mb-2 flex items-center justify-between">
                    Behavioral Competencies
                    <Badge variant="outline">{session.feedback.behavioral.score}/100</Badge>
                  </h4>
                  <p className="text-sm mb-3">{session.feedback.behavioral.feedback}</p>
                  {session.feedback.behavioral.strengths?.length > 0 && (
                    <div className="mb-2">
                      <p className="text-xs font-semibold text-green-600 dark:text-green-400 mb-1">Strengths:</p>
                      <ul className="text-xs space-y-1 pl-4">
                        {session.feedback.behavioral.strengths.map((s: string, i: number) => (
                          <li key={i} className="list-disc">{s}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {session.feedback.behavioral.improvements?.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-amber-600 dark:text-amber-400 mb-1">Areas for Improvement:</p>
                      <ul className="text-xs space-y-1 pl-4">
                        {session.feedback.behavioral.improvements.map((s: string, i: number) => (
                          <li key={i} className="list-disc">{s}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </Card>
              )}
            </div>
          )}

          {session.transcript?.messages && (
            <div>
              <h3 className="text-lg font-semibold mb-4">Full Transcript</h3>
              <div className="space-y-3">
                {session.transcript.messages.map((message: string, index: number) => (
                  <div
                    key={index}
                    className={`p-4 rounded-lg ${
                      message.startsWith('AI: ')
                        ? 'bg-primary/10 text-foreground'
                        : 'bg-accent/10 text-foreground ml-8'
                    }`}
                  >
                    <p className="text-sm font-semibold mb-2">
                      {message.startsWith('AI: ') ? '🤖 AI Interviewer' : '👤 You'}
                    </p>
                    <p className="text-sm leading-relaxed">
                      {message.replace(/^(AI: |You: )/, '')}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};

export default TranscriptModal;
