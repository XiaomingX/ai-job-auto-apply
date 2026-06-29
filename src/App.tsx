'use client'

import React, { useState, useCallback, useEffect } from 'react'
import { Rocket, Briefcase, Calendar, Globe, ChevronDown, ChevronUp } from 'lucide-react'
import { motion } from 'framer-motion'
import confetti from 'canvas-confetti'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Checkbox } from "@/components/ui/checkbox"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent } from "@/components/ui/card"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { useToast } from '@/hooks/use-toast'
import {
  DEFAULT_JOB_BOARDS,
  ALL_JOB_BOARDS,
  EXPERIENCE_LEVELS,
  JOB_TYPES,
  DATE_POSTED,
  REMOTE_PREFERENCES,
  INDUSTRIES,
  DEFAULT_APPLICATION_LIMIT,
} from '@/lib/constants'
import type { JobProfile, JobFilters } from '@/domain/models'

interface JobBoards {
  [key: string]: {
    enabled: boolean;
    limit: number;
  };
}

enum MessageType {
  START_AUTO_APPLYING = 'START_AUTO_APPLYING',
}

// Mock job profiles data with work experiences and education
const mockJobProfiles: JobProfile[] = [
  {
    id: 1,
    userId: "user1",
    fullName: "Sushen Oli",
    email: "sushensame@gmail.com",
    phone: "9848085163",
    address: "123 Main St, Anytown, USA",
    workAddress: "USA",
    linkedIn: "https://linkedin.com/in/sushen123",
    desiredJobTitle: "Software Engineer",
    jobType: "Full-time",
    workLocation: "Remote",
    willingToRelocate: true,
    salaryRange: "$80,000 - $120,000",
    availability: "Immediately",
    currentEmploymentStatus: "Employed",
    yearsOfExperience: 5,
    highestEducation: "Bachelor's Degree",
    fieldOfStudy: "Computer Science",
    graduationYear: 2018,
    primarySkills: "JavaScript, React, Node.js, Python",
    languages: "English, Spanish",
    resume: "sushen.pdf",
    coverLetter: "",
    personalStatement: "Passionate software engineer with a focus on web technologies...",
    heardAboutUs: "LinkedIn",
    isDeleted: false,
    workExperiences: [
      {
        title: "Software Engineer",
        company: "Your Journey",
        city: "America",
        description: "Developed and maintained web applications using modern JavaScript frameworks.",
        startDate: "01/2021",
        endDate: "present",
        current: true
      },
      {
        title: "Junior Developer",
        company: "Tech Innovations",
        city: "Silicon Valley",
        description: "Assisted in the development of mobile applications and performed code reviews.",
        startDate: "06/2019",
        endDate: "12/2020",
        current: false
      }
    ],
    educations: [
      {
        school: "Tribhuwan",
        degree: "BIT",
        city: "America",
        major: "Science and Technology",
        startDate: "01/2021",
        endDate: "present",
        current: true
      },
      {
        school: "BVM",
        degree: "Nepal",
        city: "Banke",
        major: "Science and technlogy",
        startDate: "06/2019",
        endDate: "12/2020",
        current: false
      }
    ]
  },
  {
    id: 2,
    userId: "user2",
    fullName: "Sushen Oli",
    email: "sushensame@gmail.com",
    phone: "987-654-3210",
    address: "789 Oak Rd, Another City, USA",
    workAddress: "101 Business Blvd, Corporatetown, USA",
    linkedIn: "https://linkedin.com/in/sushen123",
    desiredJobTitle: "Data Scientist",
    jobType: "Contract",
    workLocation: "Hybrid",
    willingToRelocate: false,
    salaryRange: "$100,000 - $150,000",
    availability: "2 weeks notice",
    currentEmploymentStatus: "Unemployed",
    yearsOfExperience: 3,
    highestEducation: "Master's Degree",
    fieldOfStudy: "Data Science",
    graduationYear: 2020,
    primarySkills: "Python, R, Machine Learning, SQL",
    languages: "English, Mandarin",
    resume: "sushen.pdf", // name of the pdf you uploaded
    coverLetter: "",
    personalStatement: "Data scientist with a strong background in statistical analysis...",
    heardAboutUs: "Friend referral",
    isDeleted: false,
    workExperiences: [
      {
        title: "Software Engineer",
        company: "Your Journey",
        city: "America",
       
        description: "Developed and maintained web applications using modern JavaScript frameworks.",
        startDate: "01/2021",
        endDate: "present",
        current: true
      },
      {
        title: "Junior Developer",
        company: "Tech Innovations",
        city: "Silicon Valley",
        description: "Assisted in the development of mobile applications and performed code reviews.",
        startDate: "06/2019",
        endDate: "12/2020",
        current: false
      }
    ],
    educations: [
      {
        school: "Tribhuwan",
        degree: "BIT",
        city: "Nepalgunj",
        major: "Science and Technology",
        startDate: "01/2021",
        endDate: "present",
        current: true
      },
      {
        school: "BVM",
        degree: "High School",
        city: "Banke",
        major: "Science and technlogy",
        startDate: "06/2019",
        endDate: "12/2020",
        current: false
      }
    ]
  },
];

const AutoApply: React.FC = () => {
  const [jobProfiles, setJobProfiles] = useState<JobProfile[]>([]);
  const [selectedProfileId, setSelectedProfileId] = useState<string>('');
  const [showAllJobBoards, setShowAllJobBoards] = useState(false);
  const [jobBoards, setJobBoards] = useState<JobBoards>(
    Object.fromEntries(ALL_JOB_BOARDS.map(board => [board, { enabled: false, limit: 0 }]))
  );
  const [userLimit] = useState(DEFAULT_APPLICATION_LIMIT);
  const [jobFilters, setJobFilters] = useState<JobFilters>({
    experienceLevel: '',
    jobType: [],
    datePosted: '',
    remotePreference: '',
    industry: [],
  });
  const [tailorResume, setTailorResume] = useState(true);

  // AI 配置状态
  const [aiConfig, setAiConfig] = useState({
    baseUrl: 'https://api.openai.com',
    apiKey: '',
    modelName: 'gpt-4',
  });
  const [aiConfigSaved, setAiConfigSaved] = useState(false);

  const { toast } = useToast();

  useEffect(() => {
    setJobProfiles(mockJobProfiles);
    loadAiConfig();
  }, []);

  // 加载 AI 配置
  const loadAiConfig = async () => {
    try {
      const result = await chrome.storage.sync.get('aiConfig');
      if (result.aiConfig) {
        setAiConfig(result.aiConfig);
        setAiConfigSaved(true);
      }
    } catch (error) {
      console.error('加载 AI 配置失败:', error);
    }
  };

  // 保存 AI 配置
  const saveAiConfig = async () => {
    try {
      await chrome.storage.sync.set({ aiConfig });
      setAiConfigSaved(true);
      toast({
        title: "配置已保存",
        description: "AI 配置已保存到本地存储",
      });
    } catch (error) {
      console.error('保存 AI 配置失败:', error);
      toast({
        title: "保存失败",
        description: "无法保存 AI 配置",
        variant: "destructive",
      });
    }
  };

  // 更新 AI 配置
  const updateAiConfig = (field: string, value: string) => {
    setAiConfig(prev => ({ ...prev, [field]: value }));
    setAiConfigSaved(false);
  };

  const toggleJobBoard = useCallback((board: string) => {
    setJobBoards(prev => ({
      ...prev,
      [board]: { ...prev[board], enabled: !prev[board].enabled }
    }));
  }, []);

  const updateJobBoardLimit = useCallback((board: string, limit: number) => {
    setJobBoards(prev => {
      const newBoards = { ...prev };
      newBoards[board].limit = limit;
      return newBoards;
    });
  }, []);

  const getTotalLimit = useCallback(() => {
    return Object.values(jobBoards).reduce((total, board) => total + board.limit, 0);
  }, [jobBoards]);

  const startAutoApplying = useCallback(() => {
    if (!selectedProfileId) {
      toast({
        title: "请选择求职档案",
        description: "开始自动投递前，请先选择一个求职档案。",
        duration: 2000,
        variant: 'destructive'
      });
      return;
    }

    const totalLimit = getTotalLimit();
    if (totalLimit > userLimit) {
      toast({
        title: "超出限制",
        description: `您的总限制 (${totalLimit}) 超过了可用限制 (${userLimit})，请调整。`,
        duration: 2000,
        variant: 'destructive'
      });
      return;
    }

    if (totalLimit === 0) {
      toast({
        title: "未设置申请数量",
        description: "开始自动投递前，请先设置申请数量限制。",
        duration: 2000,
        variant: 'destructive'
      });
      return;
    }

    const isAnyJobBoardEnabled = Object.values(jobBoards).some(board => board.enabled);

    if (!isAnyJobBoardEnabled) {
      toast({
        title: "未启用招聘平台",
        description: "请至少启用一个招聘平台后再开始投递。",
        duration: 3000,
        variant: 'destructive'
      });
      return;
    }

    const updatedJobBoards = Object.fromEntries(
      Object.entries(jobBoards).map(([key, board]) => [
        key,
        {
          ...board,
          enabled: board.limit > 0 ? board.enabled : false
        }
      ])
    );

    const selectedProfile = jobProfiles.find(profile => profile.id.toString() === selectedProfileId);

    if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
      chrome.runtime.sendMessage({
        type: MessageType.START_AUTO_APPLYING,
        updatedJobBoards,
        job: selectedProfile,
        jobFilters,
        tailorResume
      }, (response) => {
        if (response && response.success) {
          toast({
            title: "自动投递已启动",
            description: "正在为您投递职位！",
            duration: 3000
          });
          confetti({
            particleCount: 100,
            spread: 70,
            origin: { y: 0.6 }
          });
        } else {
          console.log(response);
          toast({
            title: "启动失败",
            description: "启动自动投递时出现错误。",
            duration: 3000,
            variant: 'destructive'
          });
        }
      });
    } else {
      console.log('Starting auto-apply with:', { updatedJobBoards, selectedProfile, jobFilters, tailorResume });
      toast({
        title: "自动投递已启动",
        description: "正在为您投递职位！",
        duration: 3000
      });
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
      });
    }
  }, [jobBoards, selectedProfileId, jobFilters, toast, userLimit, getTotalLimit, tailorResume, jobProfiles]);

  const visibleJobBoards = showAllJobBoards ? ALL_JOB_BOARDS : DEFAULT_JOB_BOARDS;

  return (
    <TooltipProvider>
      <div className="w-96 max-w-md p-4 bg-white rounded-xl shadow-2xl">
        <h2 className="text-2xl font-bold mb-4 text-center text-blue-800">AI自动投简历</h2>
        <div className="mb-4 text-sm text-center">
          可用申请次数：<span className="font-bold text-blue-600">{userLimit - getTotalLimit()}</span> / {userLimit}
        </div>
        <Tabs defaultValue="job-profile" className="w-full">
          <TabsList className="grid w-full grid-cols-4 mb-4">
            <TabsTrigger value="job-profile" className="text-sm">求职档案</TabsTrigger>
            <TabsTrigger value="job-boards" className="text-sm">招聘平台</TabsTrigger>
            <TabsTrigger value="filters" className="text-sm">筛选条件</TabsTrigger>
            <TabsTrigger value="ai-config" className="text-sm">AI 配置</TabsTrigger>
          </TabsList>
          <TabsContent value="job-profile">
            <Card>
              <CardContent className="pt-4">
                <Label htmlFor="jobProfile" className="text-sm">选择求职档案</Label>
                <Select onValueChange={setSelectedProfileId} value={selectedProfileId}>
                  <SelectTrigger id="jobProfile" className="text-sm">
                    <SelectValue placeholder="请选择求职档案" />
                  </SelectTrigger>
                  <SelectContent className="max-h-[200px] overflow-y-auto">
                    {jobProfiles.map((profile) => (
                      <SelectItem
                        key={profile.id}
                        value={profile.id.toString()}
                        className="text-sm"
                      >
                        {profile.desiredJobTitle} - {profile.fullName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>
            <Card className="mt-4">
              <CardContent className="pt-4">
                <Label htmlFor="tailorResume" className="text-sm flex items-center space-x-2">
                  <Checkbox
                    id="tailorResume"
                    checked={tailorResume}
                    onCheckedChange={(checked) => setTailorResume(checked as boolean)}
                  />
                  <span>根据职位描述优化简历</span>
                </Label>
              </CardContent>
            </Card>
            {selectedProfileId && (
              <Card className="mt-4">
                <CardContent className="pt-4">
                  <h3 className="text-lg font-semibold mb-2">档案详情</h3>
                  {jobProfiles.find(profile => profile.id.toString() === selectedProfileId)?.workExperiences.map((exp, index) => (
                    <div key={index} className="mb-2">
                      <h4 className="text-sm font-semibold">{exp.title} at {exp.company}</h4>
                      <p className="text-xs text-gray-600">{exp.startDate} - {exp.endDate}</p>
                      <p className="text-xs">{exp.description}</p>
                    </div>
                  ))}
                  {jobProfiles.find(profile => profile.id.toString() === selectedProfileId)?.educations.map((edu, index) => (
                    <div key={index} className="mb-2">
                      <h4 className="text-sm font-semibold">{edu.degree} in {edu.major}</h4>
                      <p className="text-xs text-gray-600">{edu.school}, {edu.city}</p>
                      <p className="text-xs">{edu.startDate} - {edu.endDate}</p>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </TabsContent>
          <TabsContent value="job-boards">
            <Card>
              <CardContent className="pt-4">
                <div className="space-y-2">
                  {visibleJobBoards.map((board) => (
                    <motion.div
                      key={board}
                      className="flex items-center justify-between p-2 bg-blue-50 rounded-lg"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <Label htmlFor={board} className="text-sm capitalize cursor-pointer flex-1">{board}</Label>
                      <div className="flex items-center space-x-2">
                        <Input
                          type="number"
                          value={jobBoards[board].limit}
                          onChange={(e) => updateJobBoardLimit(board, parseInt(e.target.value) || 0)}
                          className="w-16 text-sm"
                          min="0"
                          max={userLimit}
                        />
                        <Switch
                          id={board}
                          checked={jobBoards[board].enabled}
                          onCheckedChange={() => toggleJobBoard(board)}
                        />
                      </div>
                    </motion.div>
                  ))}
                  <Button
                    onClick={() => setShowAllJobBoards(prev => !prev)}
                    variant="outline"
                    className="w-full text-sm"
                  >
                    {showAllJobBoards ? (
                      <>
                        <ChevronUp className="mr-2 h-4 w-4" />
                        收起
                      </>
                    ) : (
                      <>
                        <ChevronDown className="mr-2 h-4 w-4" />
                        查看更多平台
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="filters">
            <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
              <FilterSection title="经验要求" icon={<Briefcase className="h-4 w-4" />}>
                <Select
                  value={jobFilters.experienceLevel}
                  onValueChange={(value) => setJobFilters(prev => ({ ...prev, experienceLevel: value }))}
                >
                  <SelectTrigger className="text-sm">
                    <SelectValue placeholder="请选择经验等级" />
                  </SelectTrigger>
                  <SelectContent>
                    {EXPERIENCE_LEVELS.map((level) => (
                      <SelectItem key={level} value={level} className="text-sm">{level}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FilterSection>

              <FilterSection title="工作类型" icon={<Briefcase className="h-4 w-4" />}>
                <div className="grid grid-cols-2 gap-2">
                  {JOB_TYPES.map((type) => (
                    <Label key={type} className="flex items-center space-x-2 text-sm">
                      <Checkbox
                        checked={jobFilters.jobType.includes(type)}
                        onCheckedChange={(checked) => {
                          setJobFilters(prev => ({
                            ...prev,
                            jobType: checked
                              ? [...prev.jobType, type]
                              : prev.jobType.filter(t => t !== type)
                          }))
                        }}
                      />
                      <span>{type}</span>
                    </Label>
                  ))}
                </div>
              </FilterSection>

              <FilterSection title="发布日期" icon={<Calendar className="h-4 w-4" />}>
                <Select
                  value={jobFilters.datePosted}
                  onValueChange={(value) => setJobFilters(prev => ({...prev, datePosted: value }))}
                >
                  <SelectTrigger className="text-sm">
                    <SelectValue placeholder="请选择发布时间" />
                  </SelectTrigger>
                  <SelectContent>
                    {DATE_POSTED.map((option) => (
                      <SelectItem key={option} value={option} className="text-sm">{option}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FilterSection>

              <FilterSection title="办公方式" icon={<Globe className="h-4 w-4" />}>
                <RadioGroup
                  value={jobFilters.remotePreference}
                  onValueChange={(value) => setJobFilters(prev => ({ ...prev, remotePreference: value }))}
                >
                  {REMOTE_PREFERENCES.map((option) => (
                    <div key={option} className="flex items-center space-x-2">
                      <RadioGroupItem value={option} id={option} />
                      <Label htmlFor={option} className="text-sm">{option}</Label>
                    </div>
                  ))}
                </RadioGroup>
              </FilterSection>

              <FilterSection title="行业领域" icon={<Briefcase className="h-4 w-4" />}>
                <div className="grid grid-cols-2 gap-2">
                  {INDUSTRIES.map((industry) => (
                    <Label key={industry} className="flex items-center space-x-2 text-sm">
                      <Checkbox
                        checked={jobFilters.industry.includes(industry)}
                        onCheckedChange={(checked) => {
                          setJobFilters(prev => ({
                            ...prev,
                            industry: checked
                              ? [...prev.industry, industry]
                              : prev.industry.filter(i => i !== industry)
                          }))
                        }}
                      />
                      <span>{industry}</span>
                    </Label>
                  ))}
                </div>
              </FilterSection>
            </div>
          </TabsContent>
          <TabsContent value="ai-config">
            <Card>
              <CardContent className="pt-4">
                <div className="space-y-4">
                  <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <p className="text-sm text-blue-800">
                      <strong>隐私提示：</strong>您的 AI 配置仅保存在本地浏览器中，不会上传到任何远程服务器。
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="ai-base-url" className="text-sm">API 地址</Label>
                    <Input
                      id="ai-base-url"
                      type="url"
                      placeholder="https://api.openai.com"
                      value={aiConfig.baseUrl}
                      onChange={(e) => updateAiConfig('baseUrl', e.target.value)}
                      className="text-sm"
                    />
                    <p className="text-xs text-gray-500">
                      支持 OpenAI、Anthropic、通义千问等兼容 OpenAI 格式的服务
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="ai-api-key" className="text-sm">API 密钥</Label>
                    <Input
                      id="ai-api-key"
                      type="password"
                      placeholder="sk-..."
                      value={aiConfig.apiKey}
                      onChange={(e) => updateAiConfig('apiKey', e.target.value)}
                      className="text-sm"
                    />
                    <p className="text-xs text-gray-500">
                      您的 API 密钥将安全存储在本地，不会泄露给第三方
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="ai-model-name" className="text-sm">模型名称</Label>
                    <Input
                      id="ai-model-name"
                      type="text"
                      placeholder="gpt-4"
                      value={aiConfig.modelName}
                      onChange={(e) => updateAiConfig('modelName', e.target.value)}
                      className="text-sm"
                    />
                    <p className="text-xs text-gray-500">
                      常用模型：gpt-4、claude-3-opus-20240229、qwen-turbo、glm-4
                    </p>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Button
                      onClick={saveAiConfig}
                      className="bg-blue-600 text-white hover:bg-blue-700 text-sm"
                    >
                      保存配置
                    </Button>
                    {aiConfigSaved && (
                      <span className="text-sm text-green-600">✓ 已保存</span>
                    )}
                  </div>

                  <div className="p-3 bg-gray-50 rounded-lg">
                    <p className="text-sm font-medium mb-2">支持的 AI 服务：</p>
                    <ul className="text-xs text-gray-600 space-y-1">
                      <li>• OpenAI: https://api.openai.com</li>
                      <li>• Anthropic: https://api.anthropic.com</li>
                      <li>• 通义千问: https://dashscope.aliyuncs.com/compatible-mode</li>
                      <li>• 智谱: https://open.bigmodel.cn/api/paas</li>
                      <li>• DeepSeek: https://api.deepseek.com</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
        <div className="mt-4">
          <Tooltip>
            <TooltipTrigger asChild>
              <div>
                <Button
                  onClick={startAutoApplying}
                  className="w-full bg-blue-600 text-white hover:bg-blue-700 text-sm"
                >
                  <Rocket className="mr-2 h-4 w-4" />
                  开始自动投递
                </Button>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              {!selectedProfileId
                ? "请先选择求职档案"
                : getTotalLimit() > userLimit
                ? "总申请数超出可用限制"
                : "点击开始自动投递"}
            </TooltipContent>
          </Tooltip>
        </div>
      </div>
    </TooltipProvider>
  );
};

const FilterSection: React.FC<{ title: string; icon: React.ReactNode; children: React.ReactNode }> = ({ title, icon, children }) => (
  <Card className="mb-2 border-blue-200">
    <CardContent className="p-3">
      <h3 className="text-sm font-semibold mb-2 flex items-center text-blue-700">
        {icon}
        <span className="ml-2">{title}</span>
      </h3>
      {children}
    </CardContent>
  </Card>
);

export default AutoApply;