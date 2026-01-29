"use client";

import * as React from "react";
import { useEditor, EditorContent, Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import {
  Bold,
  Italic,
  Underline,
  List,
  ListOrdered,
  Link as LinkIcon,
  Image as ImageIcon,
  Code,
  Heading1,
  Heading2,
  Heading3,
  Undo,
  Redo,
  Braces,
  User,
  Building2,
  Mail,
  Hash,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  minHeight?: string;
}

const MAIL_MERGE_VARIABLES = [
  { label: "First Name", value: "{{firstName}}", icon: User },
  { label: "Last Name", value: "{{lastName}}", icon: User },
  { label: "Full Name", value: "{{firstName}} {{lastName}}", icon: User },
  { label: "Title", value: "{{title}}", icon: Hash },
  { label: "Organization", value: "{{organization}}", icon: Building2 },
  { label: "Email", value: "{{email}}", icon: Mail },
  { label: "District", value: "{{district}}", icon: Hash },
  { label: "Party", value: "{{party}}", icon: Hash },
];

const BOSS_MAIL_MERGE_VARIABLES = [
  { label: "Boss First Name", value: "{{bossFirstName}}", icon: User },
  { label: "Boss Last Name", value: "{{bossLastName}}", icon: User },
  { label: "Boss Full Name", value: "{{bossFirstName}} {{bossLastName}}", icon: User },
  { label: "Boss Title", value: "{{bossTitle}}", icon: Hash },
  { label: "Boss Organization", value: "{{bossOrganization}}", icon: Building2 },
  { label: "Boss District", value: "{{bossDistrict}}", icon: Hash },
  { label: "Boss Party", value: "{{bossParty}}", icon: Hash },
];

function MenuButton({
  onClick,
  active,
  disabled,
  children,
  title,
}: {
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  children: React.ReactNode;
  title?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={cn(
        "p-2 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed",
        active && "bg-gray-200"
      )}
    >
      {children}
    </button>
  );
}

function EditorToolbar({ editor }: { editor: Editor | null }) {
  const [linkDialogOpen, setLinkDialogOpen] = React.useState(false);
  const [imageDialogOpen, setImageDialogOpen] = React.useState(false);
  const [linkUrl, setLinkUrl] = React.useState("");
  const [imageUrl, setImageUrl] = React.useState("");

  if (!editor) return null;

  const handleSetLink = () => {
    if (linkUrl) {
      editor
        .chain()
        .focus()
        .extendMarkRange("link")
        .setLink({ href: linkUrl })
        .run();
    } else {
      editor.chain().focus().unsetLink().run();
    }
    setLinkDialogOpen(false);
    setLinkUrl("");
  };

  const handleInsertImage = () => {
    if (imageUrl) {
      editor.chain().focus().setImage({ src: imageUrl }).run();
    }
    setImageDialogOpen(false);
    setImageUrl("");
  };

  const insertMailMerge = (variable: string) => {
    editor.chain().focus().insertContent(variable).run();
  };

  return (
    <>
      <div className="flex flex-wrap items-center gap-1 p-2 border-b bg-gray-50">
        {/* History */}
        <MenuButton
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().undo()}
          title="Undo"
        >
          <Undo className="h-4 w-4" />
        </MenuButton>
        <MenuButton
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().redo()}
          title="Redo"
        >
          <Redo className="h-4 w-4" />
        </MenuButton>

        <div className="w-px h-6 bg-gray-300 mx-1" />

        {/* Headings */}
        <MenuButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          active={editor.isActive("heading", { level: 1 })}
          title="Heading 1"
        >
          <Heading1 className="h-4 w-4" />
        </MenuButton>
        <MenuButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          active={editor.isActive("heading", { level: 2 })}
          title="Heading 2"
        >
          <Heading2 className="h-4 w-4" />
        </MenuButton>
        <MenuButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          active={editor.isActive("heading", { level: 3 })}
          title="Heading 3"
        >
          <Heading3 className="h-4 w-4" />
        </MenuButton>

        <div className="w-px h-6 bg-gray-300 mx-1" />

        {/* Formatting */}
        <MenuButton
          onClick={() => editor.chain().focus().toggleBold().run()}
          active={editor.isActive("bold")}
          title="Bold"
        >
          <Bold className="h-4 w-4" />
        </MenuButton>
        <MenuButton
          onClick={() => editor.chain().focus().toggleItalic().run()}
          active={editor.isActive("italic")}
          title="Italic"
        >
          <Italic className="h-4 w-4" />
        </MenuButton>
        <MenuButton
          onClick={() => editor.chain().focus().toggleCode().run()}
          active={editor.isActive("code")}
          title="Code"
        >
          <Code className="h-4 w-4" />
        </MenuButton>

        <div className="w-px h-6 bg-gray-300 mx-1" />

        {/* Lists */}
        <MenuButton
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          active={editor.isActive("bulletList")}
          title="Bullet List"
        >
          <List className="h-4 w-4" />
        </MenuButton>
        <MenuButton
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          active={editor.isActive("orderedList")}
          title="Numbered List"
        >
          <ListOrdered className="h-4 w-4" />
        </MenuButton>

        <div className="w-px h-6 bg-gray-300 mx-1" />

        {/* Link */}
        <MenuButton
          onClick={() => {
            const previousUrl = editor.getAttributes("link").href || "";
            setLinkUrl(previousUrl);
            setLinkDialogOpen(true);
          }}
          active={editor.isActive("link")}
          title="Insert Link"
        >
          <LinkIcon className="h-4 w-4" />
        </MenuButton>

        {/* Image */}
        <MenuButton
          onClick={() => setImageDialogOpen(true)}
          title="Insert Image"
        >
          <ImageIcon className="h-4 w-4" />
        </MenuButton>

        <div className="w-px h-6 bg-gray-300 mx-1" />

        {/* Mail Merge Variables */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="flex items-center gap-1 px-2 py-1.5 text-sm rounded hover:bg-gray-100"
            >
              <Braces className="h-4 w-4" />
              <span className="hidden sm:inline">Insert Variable</span>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuLabel>Contact Variables</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {MAIL_MERGE_VARIABLES.map((variable) => (
              <DropdownMenuItem
                key={variable.value}
                onClick={() => insertMailMerge(variable.value)}
              >
                <variable.icon className="h-4 w-4 mr-2 text-gray-500" />
                {variable.label}
                <span className="ml-auto text-xs text-gray-400">{variable.value}</span>
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuLabel>Boss/Principal Variables</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {BOSS_MAIL_MERGE_VARIABLES.map((variable) => (
              <DropdownMenuItem
                key={variable.value}
                onClick={() => insertMailMerge(variable.value)}
              >
                <variable.icon className="h-4 w-4 mr-2 text-gray-500" />
                {variable.label}
                <span className="ml-auto text-xs text-gray-400">{variable.value}</span>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Link Dialog */}
      <Dialog open={linkDialogOpen} onOpenChange={setLinkDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Insert Link</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>URL</Label>
              <Input
                type="url"
                placeholder="https://example.com"
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleSetLink();
                  }
                }}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLinkDialogOpen(false)}>
              Cancel
            </Button>
            {editor.isActive("link") && (
              <Button
                variant="destructive"
                onClick={() => {
                  editor.chain().focus().unsetLink().run();
                  setLinkDialogOpen(false);
                }}
              >
                Remove Link
              </Button>
            )}
            <Button onClick={handleSetLink}>
              {editor.isActive("link") ? "Update Link" : "Insert Link"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Image Dialog */}
      <Dialog open={imageDialogOpen} onOpenChange={setImageDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Insert Image</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Image URL</Label>
              <Input
                type="url"
                placeholder="https://example.com/image.jpg"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleInsertImage();
                  }
                }}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setImageDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleInsertImage} disabled={!imageUrl}>
              Insert Image
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export function RichTextEditor({
  value,
  onChange,
  placeholder,
  className,
  minHeight = "200px",
}: RichTextEditorProps) {
  const [mode, setMode] = React.useState<"visual" | "html">("visual");
  const [htmlSource, setHtmlSource] = React.useState(value);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: "text-blue-600 underline",
        },
      }),
      Image.configure({
        HTMLAttributes: {
          class: "max-w-full h-auto",
        },
      }),
    ],
    content: value,
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      onChange(html);
      setHtmlSource(html);
    },
    editorProps: {
      attributes: {
        class: cn(
          "prose prose-sm max-w-none focus:outline-none p-4",
          "min-h-[200px]"
        ),
        style: `min-height: ${minHeight}`,
      },
    },
  });

  // Sync external value changes
  React.useEffect(() => {
    if (editor && value !== editor.getHTML()) {
      editor.commands.setContent(value);
      setHtmlSource(value);
    }
  }, [value, editor]);

  const handleHtmlChange = (newHtml: string) => {
    setHtmlSource(newHtml);
    if (editor) {
      editor.commands.setContent(newHtml);
      onChange(newHtml);
    }
  };

  return (
    <div className={cn("border rounded-lg overflow-hidden", className)}>
      <Tabs value={mode} onValueChange={(v) => setMode(v as "visual" | "html")}>
        <div className="flex items-center justify-between border-b">
          {mode === "visual" && <EditorToolbar editor={editor} />}
          {mode === "html" && <div className="flex-1 p-2 bg-gray-50" />}
          <TabsList className="m-1 h-8">
            <TabsTrigger value="visual" className="text-xs px-2 py-1">
              Visual
            </TabsTrigger>
            <TabsTrigger value="html" className="text-xs px-2 py-1">
              HTML
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="visual" className="m-0">
          <EditorContent
            editor={editor}
            className="bg-white"
          />
        </TabsContent>

        <TabsContent value="html" className="m-0">
          <Textarea
            value={htmlSource}
            onChange={(e) => handleHtmlChange(e.target.value)}
            className="font-mono text-sm border-0 rounded-none focus-visible:ring-0 resize-none"
            style={{ minHeight }}
            placeholder={placeholder}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
